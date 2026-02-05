// Payment Gateway Integration
class PaymentGateway {
    constructor(gateway = 'razorpay') {
        this.gateway = gateway;
        this.config = {
            razorpay: {
                key: 'YOUR_RAZORPAY_KEY',
                currency: 'USD'
            },
            stripe: {
                publishableKey: 'YOUR_STRIPE_KEY',
                currency: 'usd'
            },
            paypal: {
                clientId: 'YOUR_PAYPAL_CLIENT_ID',
                currency: 'USD'
            }
        };
    }

    async initialize(amount, orderData) {
        switch(this.gateway) {
            case 'razorpay':
                return this.initRazorpay(amount, orderData);
            case 'stripe':
                return this.initStripe(amount, orderData);
            case 'paypal':
                return this.initPayPal(amount, orderData);
            default:
                throw new Error('Unsupported payment gateway');
        }
    }

    initRazorpay(amount, orderData) {
        const options = {
            key: this.config.razorpay.key,
            amount: amount * 100, // Amount in paise
            currency: this.config.razorpay.currency,
            name: 'YBT Digital',
            description: 'Digital Products Purchase',
            order_id: orderData.orderId,
            handler: (response) => {
                this.handlePaymentSuccess(response);
            },
            prefill: {
                name: orderData.customerName,
                email: orderData.customerEmail,
                contact: orderData.customerPhone
            },
            theme: {
                color: '#4361ee'
            },
            modal: {
                ondismiss: () => {
                    this.handlePaymentCancel();
                }
            }
        };

        const rzp = new Razorpay(options);
        rzp.open();
    }

    async initStripe(amount, orderData) {
        // Load Stripe.js
        if (!window.Stripe) {
            await this.loadScript('https://js.stripe.com/v3/');
        }

        const stripe = Stripe(this.config.stripe.publishableKey);
        
        // Create payment intent on server
        const response = await fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: amount,
                currency: this.config.stripe.currency,
                metadata: orderData
            })
        });

        const { clientSecret } = await response.json();

        // Confirm payment
        const result = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: elements.getElement('card'),
                billing_details: {
                    name: orderData.customerName,
                    email: orderData.customerEmail
                }
            }
        });

        if (result.error) {
            this.handlePaymentError(result.error);
        } else {
            this.handlePaymentSuccess(result.paymentIntent);
        }
    }

    initPayPal(amount, orderData) {
        paypal.Buttons({
            createOrder: (data, actions) => {
                return actions.order.create({
                    purchase_units: [{
                        amount: {
                            value: amount.toString(),
                            currency_code: this.config.paypal.currency
                        },
                        description: 'Digital Products Purchase'
                    }]
                });
            },
            onApprove: (data, actions) => {
                return actions.order.capture().then(details => {
                    this.handlePaymentSuccess({
                        ...details,
                        paymentId: details.id
                    });
                });
            },
            onError: (err) => {
                this.handlePaymentError(err);
            }
        }).render('#paypal-button-container');
    }

    handlePaymentSuccess(response) {
        // Show success message
        this.showPaymentStatus('success', 'Payment completed successfully!');
        
        // Update order status via API
        this.updateOrderStatus(response.paymentId || response.razorpay_payment_id, 'completed');
        
        // Redirect to download page
        setTimeout(() => {
            window.location.href = '/orders?payment=success';
        }, 2000);
    }

    handlePaymentError(error) {
        console.error('Payment error:', error);
        this.showPaymentStatus('error', error.message || 'Payment failed. Please try again.');
        
        // Update order status
        this.updateOrderStatus(null, 'failed');
    }

    handlePaymentCancel() {
        this.showPaymentStatus('info', 'Payment was cancelled.');
    }

    async updateOrderStatus(transactionId, status) {
        try {
            await fetch('/api/update-payment-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionId,
                    status,
                    orderId: localStorage.getItem('currentOrderId')
                })
            });
        } catch (error) {
            console.error('Failed to update order status:', error);
        }
    }

    showPaymentStatus(type, message) {
        const statusDiv = document.createElement('div');
        statusDiv.className = `payment-status payment-status-${type}`;
        statusDiv.innerHTML = `
            <div class="payment-status-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(statusDiv);
        
        setTimeout(() => {
            statusDiv.remove();
        }, 5000);
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
}

// Coupon Code Validation
class CouponValidator {
    constructor() {
        this.appliedCoupon = null;
    }

    async validateCoupon(code) {
        try {
            const response = await fetch(`/api/validate-coupon?code=${encodeURIComponent(code)}`);
            const data = await response.json();
            
            if (data.valid) {
                this.appliedCoupon = data.coupon;
                return data.coupon;
            } else {
                throw new Error(data.message || 'Invalid coupon code');
            }
        } catch (error) {
            throw error;
        }
    }

    calculateDiscount(amount, coupon) {
        if (coupon.discount_type === 'percentage') {
            const discount = (amount * coupon.discount_value) / 100;
            return coupon.max_discount_amount ? 
                Math.min(discount, coupon.max_discount_amount) : discount;
        } else {
            return coupon.discount_value;
        }
    }

    applyCouponToCart(cartTotal) {
        if (!this.appliedCoupon) return cartTotal;
        
        const discount = this.calculateDiscount(cartTotal, this.appliedCoupon);
        return Math.max(0, cartTotal - discount);
    }
}

// Checkout Process
class CheckoutProcess {
    constructor() {
        this.steps = ['cart', 'shipping', 'payment', 'confirmation'];
        this.currentStep = 0;
        this.orderData = {};
        
        this.init();
    }

    init() {
        this.updateStepIndicator();
        this.attachEventListeners();
    }

    updateStepIndicator() {
        const stepElements = document.querySelectorAll('.checkout-step');
        stepElements.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index === this.currentStep) {
                step.classList.add('active');
            } else if (index < this.currentStep) {
                step.classList.add('completed');
            }
        });
    }

    attachEventListeners() {
        // Next/Previous buttons
        document.querySelectorAll('.next-step').forEach(btn => {
            btn.addEventListener('click', () => this.nextStep());
        });
        
        document.querySelectorAll('.prev-step').forEach(btn => {
            btn.addEventListener('click', () => this.prevStep());
        });
        
        // Form submission
        const checkoutForm = document.getElementById('checkout-form');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', (e) => this.submitOrder(e));
        }
    }

    async nextStep() {
        if (await this.validateCurrentStep()) {
            if (this.currentStep < this.steps.length - 1) {
                this.currentStep++;
                this.updateStepIndicator();
                this.showStep(this.currentStep);
            }
        }
    }

    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.updateStepIndicator();
            this.showStep(this.currentStep);
        }
    }

    showStep(stepIndex) {
        document.querySelectorAll('.checkout-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const stepContent = document.getElementById(`${this.steps[stepIndex]}-step`);
        if (stepContent) {
            stepContent.classList.add('active');
        }
    }

    async validateCurrentStep() {
        const currentStepName = this.steps[this.currentStep];
        
        switch(currentStepName) {
            case 'cart':
                return this.validateCart();
            case 'shipping':
                return this.validateShipping();
            case 'payment':
                return this.validatePayment();
            default:
                return true;
        }
    }

    validateCart() {
        const cartManager = window.cartManager;
        if (!cartManager || cartManager.getCartCount() === 0) {
            this.showError('Your cart is empty');
            return false;
        }
        return true;
    }

    validateShipping() {
        const form = document.getElementById('shipping-form');
        if (!form) return true;
        
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                this.markFieldError(field, 'This field is required');
                isValid = false;
            } else {
                this.clearFieldError(field);
            }
        });
        
        return isValid;
    }

    validatePayment() {
        const selectedMethod = document.querySelector('.payment-method.active');
        if (!selectedMethod) {
            this.showError('Please select a payment method');
            return false;
        }
        return true;
    }

    async submitOrder(e) {
        e.preventDefault();
        
        // Collect order data
        this.orderData = {
            cart: window.cartManager?.cart || [],
            shipping: this.getFormData('shipping-form'),
            billing: this.getFormData('billing-form'),
            paymentMethod: document.querySelector('.payment-method.active')?.dataset.type,
            couponCode: window.couponValidator?.appliedCoupon?.code
        };
        
        try {
            // Create order on server
            const response = await fetch('/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.orderData)
            });
            
            const order = await response.json();
            
            // Store order ID for later reference
            localStorage.setItem('currentOrderId', order.id);
            
            // Initialize payment
            const paymentGateway = new PaymentGateway(this.orderData.paymentMethod);
            await paymentGateway.initialize(order.totalAmount, {
                orderId: order.id,
                customerName: this.orderData.shipping.name,
                customerEmail: this.orderData.shipping.email,
                customerPhone: this.orderData.shipping.phone
            });
            
        } catch (error) {
            console.error('Order submission failed:', error);
            this.showError('Failed to create order. Please try again.');
        }
    }

    getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};
        
        const formData = new FormData(form);
        const data = {};
        
        formData.forEach((value, key) => {
            data[key] = value;
        });
        
        return data;
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-error';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        `;
        
        const container = document.querySelector('.checkout-content.active');
        container.prepend(errorDiv);
        
        setTimeout(() => errorDiv.remove(), 5000);
    }

    markFieldError(field, message) {
        const errorSpan = document.createElement('span');
        errorSpan.className = 'field-error';
        errorSpan.textContent = message;
        errorSpan.style.color = 'var(--danger-color)';
        errorSpan.style.fontSize = '14px';
        errorSpan.style.display = 'block';
        errorSpan.style.marginTop = '4px';
        
        field.parentNode.appendChild(errorSpan);
        field.classList.add('error');
    }

    clearFieldError(field) {
        const errorSpan = field.parentNode.querySelector('.field-error');
        if (errorSpan) errorSpan.remove();
        field.classList.remove('error');
    }
}

// Initialize checkout process
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.checkout-page')) {
        const checkoutProcess = new CheckoutProcess();
        window.checkoutProcess = checkoutProcess;
        
        // Initialize coupon validator
        const couponValidator = new CouponValidator();
        window.couponValidator = couponValidator;
        
        // Coupon code form
        const couponForm = document.getElementById('coupon-form');
        if (couponForm) {
            couponForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const codeInput = couponForm.querySelector('input[name="coupon_code"]');
                const code = codeInput.value.trim();
                
                try {
                    const coupon = await couponValidator.validateCoupon(code);
                    const discount = couponValidator.calculateDiscount(
                        window.cartManager?.getCartTotal() || 0,
                        coupon
                    );
                    
                    // Update order summary
                    this.updateOrderSummary(discount);
                    this.showSuccess('Coupon applied successfully!');
                    
                } catch (error) {
                    this.showError(error.message);
                }
            });
        }
    }
});

// Order Summary Update
function updateOrderSummary(discount = 0) {
    const cartTotal = window.cartManager?.getCartTotal() || 0;
    const taxRate = 0.1; // 10% tax
    const tax = cartTotal * taxRate;
    const total = cartTotal + tax - discount;
    
    // Update DOM elements
    const subtotalEl = document.getElementById('cart-subtotal');
    const taxEl = document.getElementById('cart-tax');
    const discountEl = document.getElementById('cart-discount');
    const totalEl = document.getElementById('cart-total');
    
    if (subtotalEl) subtotalEl.textContent = `$${cartTotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
    if (discountEl) discountEl.textContent = `-$${discount.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
}

// Utility functions
function showSuccess(message) {
    // Implementation for success notification
}

function showError(message) {
    // Implementation for error notification
}