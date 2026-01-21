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

  loading = true;
  private scriptElement: HTMLScriptElement | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
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
