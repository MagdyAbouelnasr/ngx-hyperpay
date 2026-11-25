# NGX-Hyperpay

An Angular library for easy integration of the HyperPay payment gateway. This library provides a component that wraps the HyperPay COPYandPAY integration, making it simple to add a payment form to your Angular application.

## Installation

Install the package from npm:

```bash
npm install ngx-hyperpay
```

Works with Angular 21 and 22, with or without zone.js.

## Backend Integration Required

**Security Note:** Do NOT perform sensitive operations (like generating checkout IDs or querying payment status with authorization tokens) on the client-side.

1.  **Generate Checkout ID**: Call your backend API to Request a `checkoutId` from HyperPay using your secret entityId and authorization token.
2.  **Pass to Component**: Pass the received `checkoutId` to the `ngx-hyperpay` component.
3.  **Handle Callback**: When the payment is complete, HyperPay redirects to your `shopperResultUrl`. The component will emit the `resourcePath` (or `id`).
4.  **Verify Payment**: Send this `resourcePath` to your backend. Your backend should then query HyperPay's status API using this path to confirm the payment validity and status.

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
      [region]="'eu'"
      [locale]="'ar'"
      [integrity]="integrity"
      [shopperResultUrl]="'https://your-domain.com/callback'"
      (getResourcePath)="checkStatus($event)"
      (onCancel)="onPaymentCancel()"
      (onError)="onPaymentError($event)"
    ></ngx-hyperpay>
  `
})
export class MyComponent {
  // Both come from your server.
  checkoutId = 'YOUR_CHECKOUT_ID';
  integrity = 'sha384-...';

  checkStatus(resourcePath: string) {
    // Ask your backend for the payment status. The address alone proves nothing.
  }

  onPaymentCancel() {
    console.log('The shopper closed the payment');
  }

  onPaymentError(error: unknown) {
    console.error('An error occurred:', error);
  }
}
```

### How the result arrives

HyperPay sends the shopper to `shopperResultUrl` with a `resourcePath`. It documents no success or failure
callback, so `onSuccess` and `onFailure` are deprecated: use `getResourcePath` and check the status on your backend.

### Script integrity (PCI DSS 4)

Create the checkout with `integrity=true` and pass the `integrity` value of the response to the component. The
browser then refuses a script that was changed. The component also uses Angular's `CSP_NONCE` when you provide it.

## API

### Inputs

| Input           | Type                  | Default          | Description                                                                                             |
| --------------- | --------------------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| `checkoutId`    | `string`              | **Required**     | The checkout ID obtained from your server-side integration with HyperPay.                               |
| `brands`        | `string`              | `'VISA MASTER MADA'` | A space-separated list of payment brands to display (e.g., `'VISA MASTER AMEX'`).                       |
| `mode`          | `'test'` \| `'live'`    | `'test'`         | The mode for the HyperPay script. Use `'test'` for development and `'live'` for production.             |
| `style`         | `'card'` \| `'plain'`   | `'card'`         | The visual style of the payment form.                                                                   |
| `locale`        | `'en'` \| `'ar'`      | `'en'`           | The language of the payment widget.                                                                     |
| `region` | `'global'` \| `'eu'` | `'global'` | `eu` loads the script from `eu-test`/`eu-prod.oppwa.com`. Ask HyperPay which one your account uses. |
| `integrity` | `string` | `''` | The `integrity` value of the created checkout. |
| `loadingText` | `string` | By `locale` | The text under the spinner. |
| `options` | `Record<string, unknown>` | `{}` | More `wpwlOptions`. The options the component sets itself win. |
| `shopperResultUrl`| `string`              | `''`             | The custom callback URL to redirect to after payment. Overrides `redirectUrl` and default behavior.     |
| `redirectUrl`   | `string`              | `''`             | The URL to redirect to after the payment. Defaults to the current URL.                                  |

### Outputs

| Output      | EventEmitter&lt;any&gt; | Description                                            |
| ----------- | ---------------------- | ------------------------------------------------------ |
| `onReady`   | `void`                 | Emitted when the HyperPay widget is ready.             |
| `onSuccess` | `any` | **Deprecated.** HyperPay documents no such callback. |
| `onFailure` | `any` | **Deprecated.** HyperPay documents no such callback. |
| `onCancel` | `any` | Emitted when the shopper closes the payment before finishing it. |
| `onError` | `any` | Emitted when the script cannot be loaded or HyperPay reports an error, such as an expired checkout. |
| `getResourcePath`| `string`              | Emitted when `resourcePath` query parameter is found (decoded). |
| `getRawResourcePath`| `string`              | Emitted when `resourcePath` query parameter is found (raw encoded). |
| `getId` | `string` | Emitted when `id` query parameter is found (decoded). |
| `getRawId` | `string` | Emitted when `id` query parameter is found (raw encoded). |

## Development

This library was generated with [Angular CLI](https://github.com/angular/angular-cli).

### Build

Run `ng build ngx-hyperpay` to build the project. The build artifacts will be stored in the `dist/` directory.

### Test

Run `npm run test:ci`. CI runs it on Angular 21 and 22.

### Publishing

A push to `main` runs semantic-release, which publishes to npm.

## Repository

The source code is available on [GitHub](https://github.com/MagdyAbouelnasr/ngx-hyperpay).