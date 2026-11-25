import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NgxHyperpayComponent } from './hyperpay-widget.component';

describe('NgxHyperpayComponent on the server', () => {
  it('renders without touching the window or loading anything', () => {
    TestBed.configureTestingModule({
      imports: [NgxHyperpayComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    const fixture = TestBed.createComponent(NgxHyperpayComponent);
    fixture.componentInstance.checkoutId = '1';

    fixture.detectChanges();
    fixture.destroy();

    expect(document.querySelector('script[src*="paymentWidgets.js"]')).toBeNull();
  });
});
