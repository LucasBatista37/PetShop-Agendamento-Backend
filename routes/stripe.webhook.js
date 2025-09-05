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

      const getCustomerEmail = async (customerId, customerEmail) => {
        if (customerEmail) return customerEmail;
        if (!customerId) return null;
        const customer = await stripe.customers.retrieve(customerId);
        return customer.email || null;
      };

      const updateUserSubscription = async (
        email,
        subscriptionId,
        customerId,
        status,
        currentPeriodEnd
      ) => {
        if (!email) return;
        const update = {
          subscription: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            status,
            currentPeriodEnd,
          },
        };
        await User.findOneAndUpdate({ email }, update, { new: true });
      };

      const getFreshSubscription = async (subscriptionId) => {
        return await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["latest_invoice.payment_intent", "latest_invoice.lines"],
        });
      };

      const resolveCurrentPeriodEnd = (subscription, invoice) => {
        if (subscription?.current_period_end) {
          return new Date(subscription.current_period_end * 1000);
        }
        if (invoice?.lines?.data?.[0]?.period?.end) {
          return new Date(invoice.lines.data[0].period.end * 1000);
        }
        return null;
      };

      switch (event.type) {
        case "checkout.session.completed":
          if (!data.subscription) break;
          const customerEmail = await getCustomerEmail(
            data.customer,
            data.customer_email
          );
          await updateUserSubscription(
            customerEmail,
            data.subscription,
            data.customer,
            "active",
            null
          );
          break;

        case "customer.subscription.created":
        case "customer.subscription.updated":
          try {
            const subscription = await getFreshSubscription(data.id);
            const customerEmail2 = await getCustomerEmail(
              subscription.customer,
              subscription.customer_email
            );
            const currentPeriodEnd = resolveCurrentPeriodEnd(
              subscription,
              subscription.latest_invoice
            );
            await updateUserSubscription(
              customerEmail2,
              subscription.id,
              subscription.customer,
              subscription.status,
              currentPeriodEnd
            );
          } catch (err) {
            return res.sendStatus(500);
          }
          break;

        case "invoice.paid":
        case "invoice.payment_succeeded":
          if (!data.subscription) break;
          const subscription2 = await getFreshSubscription(data.subscription);
          const customerEmail3 = await getCustomerEmail(
            data.customer,
            data.customer_email
          );
          const currentPeriodEnd2 = resolveCurrentPeriodEnd(
            subscription2,
            data
          );
          await updateUserSubscription(
            customerEmail3,
            subscription2.id,
            subscription2.customer,
            "active",
            currentPeriodEnd2
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
