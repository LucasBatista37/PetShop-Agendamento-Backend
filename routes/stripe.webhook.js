const express = require("express");
const webhookRouter = express.Router();
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const User = require("../models/User");

webhookRouter.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      const data = event.data.object;

      switch (event.type) {
        case "checkout.session.completed":
          if (!data.subscription) break;

          const subscription = await stripe.subscriptions.retrieve(
            data.subscription
          );

          await User.findOneAndUpdate(
            { email: data.customer_email },
            {
              subscription: {
                stripeCustomerId: data.customer,
                stripeSubscriptionId: subscription.id,
                status: "active",
                currentPeriodEnd: new Date(
                  subscription.current_period_end * 1000
                ),
              },
            },
            { new: true }
          );
          break;

        case "invoice.payment_failed":
          await User.findOneAndUpdate(
            { "subscription.stripeCustomerId": data.customer },
            { "subscription.status": "past_due" },
            { new: true }
          );
          break;

        case "customer.subscription.deleted":
          await User.findOneAndUpdate(
            { "subscription.stripeSubscriptionId": data.id },
            { "subscription.status": "canceled" },
            { new: true }
          );
          break;

        default:
          break;
      }

      res.sendStatus(200);
    } catch (err) {
      res.sendStatus(500);
    }
  }
);

module.exports = webhookRouter;
