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
});
