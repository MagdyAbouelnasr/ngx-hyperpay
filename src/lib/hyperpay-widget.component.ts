import { Component, Input, OnInit, OnDestroy, Inject, PLATFORM_ID, Output, EventEmitter } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: "ngx-hyperpay",
  imports: [],
  standalone: true,
  templateUrl: "./hyperpay-widget.component.html",
  styleUrls: ["./hyperpay-widget.component.scss"],
})
export class NgxHyperpayComponent implements OnInit, OnDestroy {
  @Input() checkoutId!: string;
  @Input() brands: string = "VISA MASTER MADA";
  @Input() mode: "test" | "live" = "test";
  @Input() style: "card" | "plain" = "card";
  @Input() locale: "en" | "ar" = "en";

  @Input() shopperResultUrl: string = "";
  @Input() redirectUrl: string = "";

  @Output() onReady = new EventEmitter<void>();
  @Output() onSuccess = new EventEmitter<any>();
  @Output() onFailure = new EventEmitter<any>();
  @Output() onCancel = new EventEmitter<any>();
  @Output() onError = new EventEmitter<any>();
  @Output() getResourcePath = new EventEmitter<string>();
  @Output() getRawResourcePath = new EventEmitter<string>();
  @Output() getId = new EventEmitter<string>();
  @Output() getRawId = new EventEmitter<string>();

  loading = true;
  private scriptElement: HTMLScriptElement | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const resourcePathRaw = this.getRawQueryParam('resourcePath');
      if (resourcePathRaw) {
        this.getRawResourcePath.emit(resourcePathRaw);
        try {
          const resourcePathDecoded = decodeURIComponent(resourcePathRaw);
          this.getResourcePath.emit(resourcePathDecoded);
        } catch (e) {
          console.error('Failed to decode resourcePath', e);
          this.getResourcePath.emit(resourcePathRaw);
        }
      }

      const idRaw = this.getRawQueryParam('id');
      if (idRaw) {
        this.getRawId.emit(idRaw);
        try {
          const idDecoded = decodeURIComponent(idRaw);
          this.getId.emit(idDecoded);
        } catch (e) {
          console.error('Failed to decode id', e);
          this.getId.emit(idRaw);
        }
      }

      this.initializeWpwlOptions();
      if (!this.shopperResultUrl && !this.redirectUrl) {
        this.redirectUrl = window.location.href;
      }

      if (this.checkoutId) {
        this.loadHyperpayScript();
      } else {
        this.loading = false;
        console.error("Cannot load Hyperpay script: Missing checkoutId");
        this.onError.emit("Cannot load Hyperpay script: Missing checkoutId");
      }
    }
  }

  get effectiveRedirectUrl(): string {
    return this.shopperResultUrl || this.redirectUrl;
  }

  private getRawQueryParam(paramName: string): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const search = window.location.search;
    const regex = new RegExp('[?&]' + paramName + '=([^&]*)');
    const match = search.match(regex);
    return match ? match[1] : null;
  }

  private initializeWpwlOptions(): void {
    if (isPlatformBrowser(this.platformId)) {
      (window as any).wpwlOptions = {
        style: this.style,
        locale: this.locale,
        onReady: () => {
          this.onReady.emit();
        },
        onSuccess: (data: any) => {
          this.onSuccess.emit(data);
        },
        onFailure: (data: any) => {
          this.onFailure.emit(data);
        },
        onCancel: (data: any) => {
          this.onCancel.emit(data);
        },
      };
    }
  }

  private loadHyperpayScript(): void {
    const baseUrl =
      this.mode === "test" ? "https://test.oppwa.com" : "https://oppwa.com";
    const scriptUrl = `${baseUrl}/v1/paymentWidgets.js?checkoutId=${this.checkoutId}`;

    this.scriptElement = document.createElement("script");
    this.scriptElement.src = scriptUrl;
    this.scriptElement.async = true;

    this.scriptElement.onload = () => {
      this.loading = false;
    };

    this.scriptElement.onerror = (error) => {
      this.loading = false;
      this.onError.emit(error);
      console.error("Failed to load Hyperpay script", error);
    };

    document.body.appendChild(this.scriptElement);
  }

  ngOnDestroy(): void {
    if (this.scriptElement && document.body.contains(this.scriptElement)) {
      document.body.removeChild(this.scriptElement);
    }

    if (isPlatformBrowser(this.platformId)) {
      delete (window as any).wpwlOptions;
    }
  }
}
