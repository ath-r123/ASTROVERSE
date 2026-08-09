const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Wallet = require('../models/Wallet');
const { requireAuth } = require('../middleware/auth');

// Initialize Razorpay Instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKey123',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'mockSecret123'
});

// GET /api/wallet - Get current balance and transaction history
router.get('/', requireAuth, async (req, res, next) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) {
      wallet = await Wallet.create({ user: req.user.id, balance: 0, transactions: [] });
    }
    res.status(200).json({ success: true, balance: wallet.balance, transactions: wallet.transactions });
  } catch (err) {
    next(err);
  }
});

// POST /api/wallet/create-order - Create Razorpay payment order
router.post('/create-order', requireAuth, async (req, res, next) => {
  try {
    const { amount } = req.body; // Amount in INR
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid recharge amount.' });
    }

    const options = {
      amount: Math.round(amount * 100), // Amount in paise
      currency: 'INR',
      receipt: `receipt_wallet_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKey123'
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/wallet/verify-payment - Verify Razorpay signature and credit balance
router.post('/verify-payment', requireAuth, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'mockSecret123')
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed: Invalid signature.' });
    }

    let wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) {
      wallet = await Wallet.create({ user: req.user.id, balance: 0, transactions: [] });
    }

    wallet.balance += Number(amount);
    wallet.transactions.push({
      type: 'credit',
      amount: Number(amount),
      description: 'Wallet Recharge via Razorpay',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id
    });

    await wallet.save();

    res.status(200).json({
      success: true,
      message: 'Wallet balance successfully recharged!',
      newBalance: wallet.balance
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;