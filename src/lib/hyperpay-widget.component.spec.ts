import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxHyperpayComponent } from './hyperpay-widget.component';
import { PLATFORM_ID } from '@angular/core';

describe('NgxHyperpayComponent', () => {
  let component: NgxHyperpayComponent;
  let fixture: ComponentFixture<NgxHyperpayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxHyperpayComponent],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgxHyperpayComponent);
    component = fixture.componentInstance;
    component.checkoutId = 'test-checkout-id-123';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should prioritize shopperResultUrl over redirectUrl', () => {
    component.shopperResultUrl = 'https://custom-callback.com';
    component.redirectUrl = 'https://default-redirect.com';
    expect(component.effectiveRedirectUrl).toBe('https://custom-callback.com');
  });

  it('should use redirectUrl if shopperResultUrl is not provided', () => {
    component.shopperResultUrl = '';
    component.redirectUrl = 'https://default-redirect.com';
    expect(component.effectiveRedirectUrl).toBe('https://default-redirect.com');
  });

  it('should set the form action to the effectiveRedirectUrl', () => {
    component.shopperResultUrl = 'https://action-url.com';
    fixture.detectChanges();
    const formElement: HTMLFormElement = fixture.nativeElement.querySelector('form');
    expect(formElement.getAttribute('action')).toBe('https://action-url.com');
  });

  describe("with resourcePath and id in URL", () => {
    const originalUrl = window.location.href;

    beforeEach(() => {
      const url = new URL(window.location.href);
      // Set encoded values
      // /v1/checkouts/123/payment -> %2Fv1%2Fcheckouts%2F123%2Fpayment
      url.searchParams.set("resourcePath", "/v1/checkouts/123/payment");
      // Note: URL searchParams encodes automatically.
      // We manually verify raw vs decoded.
      // Let's force a raw search string to be sure about encoding

      const baseUrl = url.origin + url.pathname;
      const search =
        "?resourcePath=%2Fv1%2Fcheckouts%2F123%2Fpayment&id=8a82944a4cc%25";
      // id example with percentage: 8a82944a4cc%25 (encoded %)

      window.history.replaceState({}, "", baseUrl + search);
    });

    afterEach(() => {
      window.history.replaceState({}, "", originalUrl);
    });

    it("should emit decoded and raw values", () => {
      // Create a fresh fixture to trigger ngOnInit with the new URL
      const newFixture = TestBed.createComponent(NgxHyperpayComponent);
      const newComponent = newFixture.componentInstance;
      newComponent.checkoutId = "test-checkout-id-123";

      spyOn(newComponent.getResourcePath, "emit");
      spyOn(newComponent.getRawResourcePath, "emit");
      spyOn(newComponent.getId, "emit");
      spyOn(newComponent.getRawId, "emit");

      newFixture.detectChanges(); // Triggers ngOnInit

      // resourcePath
      expect(newComponent.getResourcePath.emit).toHaveBeenCalledWith(
        "/v1/checkouts/123/payment",
      );
      expect(newComponent.getRawResourcePath.emit).toHaveBeenCalledWith(
        "%2Fv1%2Fcheckouts%2F123%2Fpayment",
      );

      // id
      expect(newComponent.getId.emit).toHaveBeenCalledWith("8a82944a4cc%");
      expect(newComponent.getRawId.emit).toHaveBeenCalledWith("8a82944a4cc%25");
    });
  });

  describe('the widget on the page', () => {
    const wpwlWindow = window as unknown as {
      wpwlOptions?: Record<string, (value?: unknown) => void>;
      wpwl?: { unload: () => void };
    };
    const scripts = (): HTMLScriptElement[] =>
      Array.from(document.querySelectorAll<HTMLScriptElement>('script[src*="paymentWidgets.js"]'));
    const script = (): HTMLScriptElement => scripts()[0];
    const text = (): string => fixture.nativeElement.textContent.trim();

    afterEach(() => {
      fixture.destroy();
      delete wpwlWindow.wpwl;
    });

    it('loads one script for the checkout and hides the spinner when it arrives', () => {
      expect(scripts().length).toBe(1);
      expect(script().src).toBe(
        'https://test.oppwa.com/v1/paymentWidgets.js?checkoutId=test-checkout-id-123',
      );
      expect(text()).toContain('Loading payment options');
      expect(component.loading).toBe(true);

      script().onload!(new Event('load'));
      fixture.detectChanges();

      expect(text()).toBe('');
      expect(component.loading).toBe(false);
    });

    it('loads the new checkout, with a new form, when the id changes', () => {
      const form = fixture.nativeElement.querySelector('form');

      fixture.componentRef.setInput('checkoutId', 'second');
      fixture.detectChanges();

      expect(scripts().length).toBe(1);
      expect(script().src).toContain('checkoutId=second');
      expect(fixture.nativeElement.querySelector('form')).not.toBe(form);
    });

    it('does not reload for an input that does not change the widget', () => {
      const before = script();

      fixture.componentRef.setInput('loadingText', 'Wait');
      fixture.detectChanges();

      expect(script()).toBe(before);
      expect(text()).toBe('Wait');
    });

    it('asks the browser to check the integrity when it is given', () => {
      expect(script().integrity).toBe('');

      fixture.componentRef.setInput('integrity', 'sha384-abc');
      fixture.detectChanges();

      expect(script().integrity).toBe('sha384-abc');
      expect(script().crossOrigin).toBe('anonymous');
    });

    it('speaks the language of the widget', () => {
      fixture.componentRef.setInput('locale', 'ar');
      fixture.detectChanges();

      expect(text()).toContain('جاري تحميل');
    });

    it('passes the errors of HyperPay on, and a closed payment as a cancel', () => {
      const errors: unknown[] = [];
      const cancels: unknown[] = [];
      component.onError.subscribe(e => errors.push(e));
      component.onCancel.subscribe(e => cancels.push(e));
      const expired = { name: 'InvalidCheckoutIdError' };
      const closed = { name: 'WidgetError', event: 'closed' };

      wpwlWindow.wpwlOptions!['onError'](expired);
      wpwlWindow.wpwlOptions!['onError'](closed);
      wpwlWindow.wpwlOptions!['onLightboxCancel']();

      expect(errors).toEqual([expired]);
      expect(cancels).toEqual([closed, undefined]);
    });

    it('tells when the form is ready and when the script cannot be loaded', () => {
      spyOn(console, 'error');
      const events: string[] = [];
      component.onReady.subscribe(() => events.push('ready'));
      component.onError.subscribe(() => events.push('error'));

      wpwlWindow.wpwlOptions!['onReady']();
      script().onerror!(new Event('error'));

      expect(events).toEqual(['ready', 'error']);
      expect(component.loading).toBe(false);
    });

    it('lets the application add options but not replace its own', () => {
      const other = TestBed.createComponent(NgxHyperpayComponent);
      other.componentInstance.checkoutId = 'x';
      other.componentInstance.options = { requireCvv: true, locale: 'fr' };
      other.detectChanges();

      expect(wpwlWindow.wpwlOptions).toEqual(
        jasmine.objectContaining({ requireCvv: true, locale: 'en' }) as never,
      );
      other.destroy();
    });

    it('reports a missing checkout id and loads nothing', () => {
      spyOn(console, 'error');
      const other = TestBed.createComponent(NgxHyperpayComponent);
      const errors: unknown[] = [];
      other.componentInstance.onError.subscribe(e => errors.push(e));

      other.detectChanges();

      expect(errors.length).toBe(1);
      expect(scripts().length).toBe(1);
      other.destroy();
    });

    it('cleans up after itself and leaves other scripts and options alone', () => {
      const unload = jasmine.createSpy('unload');
      wpwlWindow.wpwl = { unload };
      const added = ['https://test.oppwa.com/v1/static/static.min.js', 'https://cdn.test/static.min.js'].map(
        src => {
          const element = document.createElement('script');
          element.type = 'text/plain';
          element.src = src;
          document.head.appendChild(element);
          return element;
        },
      );

      fixture.destroy();

      expect(unload).toHaveBeenCalledTimes(1);
      expect(scripts().length).toBe(0);
      expect(added.map(e => e.isConnected)).toEqual([false, true]);
      expect(wpwlWindow.wpwlOptions).toBeUndefined();
      added[1].remove();
    });

    it('does not remove options that someone else set meanwhile', () => {
      const foreign = {};
      wpwlWindow.wpwlOptions = foreign;

      fixture.destroy();

      expect(wpwlWindow.wpwlOptions).toBe(foreign);
      delete wpwlWindow.wpwlOptions;
    });
  });
});
