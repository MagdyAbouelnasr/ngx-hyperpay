# NGX-Hyperpay

An Angular library for easy integration of the HyperPay payment gateway. This library provides a component that wraps the HyperPay COPYandPAY integration, making it simple to add a payment form to your Angular application.

## Installation

Install the package from npm:

```bash
npm install ngx-hyperpay
```

## Usage

1.  Import the `NgxHyperpayComponent` in your component or module:

```typescript
import { NgxHyperpayComponent } from 'ngx-hyperpay';

@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [NgxHyperpayComponent],
  template: `
    <ngx-hyperpay
      [checkoutId]="checkoutId"
      [brands]="'VISA MASTER MADA'"
      [mode]="'test'"
      [shopperResultUrl]="'https://your-domain.com/callback'" 
      [redirectUrl]="'https://your-domain.com/home'"
      (onSuccess)="onPaymentSuccess($event)"
      (onFailure)="onPaymentFailure($event)"
      (onCancel)="onPaymentCancel($event)"
      (onError)="onPaymentError($event)"
    ></ngx-hyperpay>
  `
})
export class MyComponent {
  checkoutId = 'YOUR_CHECKOUT_ID'; // Obtain this from your server

  onPaymentSuccess(data: any) {
    console.log('Payment successful:', data);
  }

  onPaymentFailure(data: any) {
    console.log('Payment failed:', data);
  }

  onPaymentCancel(data: any) {
    console.log('Payment cancelled:', data);
  }

  onPaymentError(error: any) {
    console.error('An error occurred:', error);
  }
}
```

## API

### Inputs

| Input           | Type                  | Default          | Description                                                                                             |
| --------------- | --------------------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| `checkoutId`    | `string`              | **Required**     | The checkout ID obtained from your server-side integration with HyperPay.                               |
| `brands`        | `string`              | `'VISA MASTER MADA'` | A space-separated list of payment brands to display (e.g., `'VISA MASTER AMEX'`).                       |
| `mode`          | `'test'` \| `'live'`    | `'test'`         | The mode for the HyperPay script. Use `'test'` for development and `'live'` for production.             |
| `style`         | `'card'` \| `'plain'`   | `'card'`         | The visual style of the payment form.                                                                   |
| `locale`        | `'en'` \| `'ar'`      | `'en'`           | The language of the payment widget.                                                                     |
| `paymentTarget` | `string`              | `'hyperpay-frame'` | The name of the iframe where the payment form will be rendered.                                         |
| `shopperResultUrl`| `string`              | `''`             | The custom callback URL to redirect to after payment. Overrides `redirectUrl` and default behavior.     |
| `redirectUrl`   | `string`              | `''`             | The URL to redirect to after the payment. Defaults to the current URL.                                  |

### Outputs

| Output      | EventEmitter&lt;any&gt; | Description                                            |
| ----------- | ---------------------- | ------------------------------------------------------ |
| `onReady`   | `void`                 | Emitted when the HyperPay widget is ready.             |
| `onSuccess` | `any`                  | Emitted when the payment is successful.                |
| `onFailure` | `any`                  | Emitted when the payment fails.                        |
| `onCancel`  | `any`                  | Emitted when the user cancels the payment.             |
| `onError`   | `any`                  | Emitted when an error occurs (e.g., script fails to load). |

## Development

This library was generated with [Angular CLI](https://github.com/angular/angular-cli).

### Build

Run `ng build ngx-hyperpay` to build the project. The build artifacts will be stored in the `dist/` directory.

### Publishing

After building your library with `ng build ngx-hyperpay`, go to the dist folder `cd dist/ngx-hyperpay` and run `npm publish`.

## Repository

The source code is available on [GitLab](https://github.com/MagdyAbouelnasr/ngx-hyperpay).