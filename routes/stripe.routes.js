const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const User = require("../models/User");

router.post("/create-checkout-session", async (req, res) => {
  try {
    const { priceId, customerEmail } = req.body;

    const user = await User.findOne({ email: customerEmail });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    if (user.subscription?.status === "active") {
      return res.status(400).json({
        error: "Usuário já possui assinatura ativa",
        subscriptionId: user.subscription.stripeSubscriptionId,
      });
    }

    let customerId = user.subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: user.name,
      });
      customerId = customer.id;

      user.subscription = user.subscription || {};
      user.subscription.stripeCustomerId = customerId;
      await user.save();
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Erro ao criar sessão de checkout:", err);
    res.status(500).json({ error: "Erro ao criar sessão de checkout" });
  }
});

module.exports = router;
