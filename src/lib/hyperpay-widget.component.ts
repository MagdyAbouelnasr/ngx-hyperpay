import { DOCUMENT, isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  CSP_NONCE,
  EventEmitter,
  inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  signal,
  SimpleChanges,
} from '@angular/core';
import {
  decodeParam,
  hyperpayScriptUrl,
  HyperpayMode,
  HyperpayRegion,
  isHyperpayScript,
  rawQueryParam,
} from './hyperpay-script';

/** The error HyperPay passes to its `onError` callback. */
export interface HyperpayWidgetError {
  name?: string;
  message?: string;
  brand?: string;
  /** "closed" when the shopper closed the payment before finishing it. */
  event?: string;
}

interface HyperpayWindow extends Window {
  wpwlOptions?: Record<string, unknown>;
  wpwl?: { unload?: () => void };
}

const LOADING_TEXT = { en: 'Loading payment options...', ar: 'جاري تحميل خيارات الدفع...' };

@Component({
  selector: 'ngx-hyperpay',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './hyperpay-widget.component.html',
  styleUrl: './hyperpay-widget.component.scss',
  // Angular 22 changes the default. Inputs set from code (not a template) must keep showing.
  changeDetection: ChangeDetectionStrategy.Default,
})
export class NgxHyperpayComponent implements OnInit, OnChanges, OnDestroy {
  @Input() checkoutId!: string;
  @Input() brands: string = 'VISA MASTER MADA';
  @Input() mode: HyperpayMode = 'test';
  /** `eu` loads the script from eu-test/eu-prod.oppwa.com. Ask HyperPay which one your account uses. */
  @Input() region: HyperpayRegion = 'global';
  @Input() style: 'card' | 'plain' = 'card';
  @Input() locale: 'en' | 'ar' = 'en';
  /** The `integrity` value HyperPay returns when the checkout is created with `integrity=true`. */
  @Input() integrity: string = '';
  /** Text under the spinner. Defaults to the language of `locale`. */
  @Input() loadingText: string = '';
  /** More `wpwlOptions` for HyperPay. The options this component sets itself win. */
  @Input() options: Record<string, unknown> = {};

  @Input() shopperResultUrl: string = '';
  @Input() redirectUrl: string = '';

  /** The payment form is ready. */
  @Output() onReady = new EventEmitter<void>();
  /**
   * @deprecated HyperPay documents no such callback: the result comes with the redirect. Use
   * `getResourcePath` and ask your backend for the payment status.
   */
  @Output() onSuccess = new EventEmitter<any>();
  /** @deprecated See `onSuccess`. For errors of the widget use `onError`. */
  @Output() onFailure = new EventEmitter<any>();
  /** The shopper closed the payment before finishing it. */
  @Output() onCancel = new EventEmitter<any>();
  /** The script could not be loaded, or HyperPay reported an error such as an expired checkout. */
  @Output() onError = new EventEmitter<any>();
  @Output() getResourcePath = new EventEmitter<string>();
  @Output() getRawResourcePath = new EventEmitter<string>();
  @Output() getId = new EventEmitter<string>();
  @Output() getRawId = new EventEmitter<string>();

  /** A signal, so the spinner also goes away in a zoneless application. */
  protected readonly isLoading = signal(true);
  /** Counts the loads: HyperPay replaces the form with its own, so every load gets a new form. */
  protected readonly loadId = signal(0);

  private readonly document = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private readonly nonce = inject(CSP_NONCE, { optional: true });
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private scriptElement: HTMLScriptElement | null = null;
  /** The options object this component put on the window, to leave those of another one alone. */
  private ownOptions: Record<string, unknown> | null = null;
  private defaultRedirectUrl = '';
  private isStarted = false;

  get loading(): boolean {
    return this.isLoading();
  }

  get effectiveRedirectUrl(): string {
    return this.shopperResultUrl || this.redirectUrl || this.defaultRedirectUrl;
  }

  get effectiveLoadingText(): string {
    return this.loadingText || LOADING_TEXT[this.locale] || LOADING_TEXT.en;
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    this.isStarted = true;
    this.defaultRedirectUrl = this.document.location.href;
    this.emitParam('resourcePath', this.getRawResourcePath, this.getResourcePath);
    this.emitParam('id', this.getRawId, this.getId);
    this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const reloading = ['checkoutId', 'mode', 'region', 'integrity', 'locale', 'style', 'brands'];
    // The first values are handled by ngOnInit.
    if (this.isStarted && reloading.some(name => changes[name])) {
      this.unload();
      this.load();
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser) this.unload();
  }

  private emitParam(name: string, raw: EventEmitter<string>, decoded: EventEmitter<string>): void {
    const value = rawQueryParam(this.document.location.search, name);
    if (!value) return;
    raw.emit(value);
    decoded.emit(decodeParam(value));
  }

  private load(): void {
    if (!this.checkoutId) {
      this.isLoading.set(false);
      const message = 'Cannot load Hyperpay script: Missing checkoutId';
      console.error(message);
      this.onError.emit(message);
      return;
    }

    this.isLoading.set(true);
    this.loadId.update(id => id + 1);
    this.setOptions();

    const script = this.document.createElement('script');
    script.src = hyperpayScriptUrl(this.checkoutId, this.mode, this.region);
    script.async = true;
    if (this.integrity) {
      script.integrity = this.integrity;
      script.crossOrigin = 'anonymous';
    }
    if (this.nonce) script.nonce = this.nonce;
    script.onload = () => this.isLoading.set(false);
    script.onerror = error => {
      this.isLoading.set(false);
      console.error('Failed to load Hyperpay script', error);
      this.zone.run(() => this.onError.emit(error));
    };

    this.scriptElement = script;
    this.document.body.appendChild(script);
  }

  private setOptions(): void {
    // HyperPay calls back from its own code, so every event goes through the zone of the application.
    const emit =
      (output: EventEmitter<any>) =>
      (data?: unknown): void =>
        this.zone.run(() => output.emit(data));

    this.ownOptions = {
      ...this.options,
      style: this.style,
      locale: this.locale,
      onReady: () => this.zone.run(() => this.onReady.emit()),
      onSuccess: emit(this.onSuccess),
      onFailure: emit(this.onFailure),
      onCancel: emit(this.onCancel),
      onLightboxCancel: emit(this.onCancel),
      onError: (error?: HyperpayWidgetError) =>
        emit(error?.event === 'closed' ? this.onCancel : this.onError)(error),
    };
    this.window.wpwlOptions = this.ownOptions;
  }

  /** What HyperPay documents for a page that stays open: unload the widget, then remove its scripts. */
  private unload(): void {
    this.window.wpwl?.unload?.();

    if (this.scriptElement) {
      this.scriptElement.onload = null;
      this.scriptElement.onerror = null;
      this.scriptElement.remove();
      this.scriptElement = null;
    }
    this.document.querySelectorAll<HTMLScriptElement>('script[src*="static.min.js"]').forEach(s => {
      if (isHyperpayScript(s.src)) s.remove();
    });

    if (this.ownOptions && this.window.wpwlOptions === this.ownOptions) {
      delete this.window.wpwlOptions;
    }
    this.ownOptions = null;
  }

  private get window(): HyperpayWindow {
    return this.document.defaultView as HyperpayWindow;
  }
}
