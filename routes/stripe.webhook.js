const express = require("express");
const webhookRouter = express.Router();
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const User = require("../models/User");
const transporter = require("../utils/mailer");
const { generateWelcomeEmail } = require("../utils/emailTemplates");

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
      console.log(`[WEBHOOK] Evento recebido: ${event.type}`);
    } catch (err) {
      console.error("[WEBHOOK] Erro na validação de assinatura:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      const data = event.data.object;

      const updateUserSubscription = async (
        customerId,
        subscriptionId,
        status,
        currentPeriodStart,
        currentPeriodEnd
      ) => {
        const update = {
          subscription: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            status,
            currentPeriodStart,
            currentPeriodEnd,
          },
        };
        console.log(
          `[WEBHOOK] Atualizando usuário: ${customerId}, status: ${status}, currentPeriod: ${currentPeriodStart} - ${currentPeriodEnd}`
        );
        return await User.findOneAndUpdate(
          { "subscription.stripeCustomerId": customerId },
          update,
          { new: true }
        );
      };

      const getFreshSubscription = async (subscriptionId) => {
        console.log(`[WEBHOOK] Buscando assinatura fresca: ${subscriptionId}`);
        return await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["latest_invoice.payment_intent", "latest_invoice.lines"],
        });
      };

      const resolveCurrentPeriod = (subscription, invoice) => {
        let start = null;
        let end = null;

        if (
          subscription?.current_period_start &&
          subscription?.current_period_end
        ) {
          start = new Date(subscription.current_period_start * 1000);
          end = new Date(subscription.current_period_end * 1000);
        } else if (invoice?.lines?.data?.length) {
          const lastLine = invoice.lines.data[invoice.lines.data.length - 1];
          start = lastLine.period?.start
            ? new Date(lastLine.period.start * 1000)
            : null;
          end = lastLine.period?.end
            ? new Date(lastLine.period.end * 1000)
            : null;
        }

        return { start, end };
      };

      switch (event.type) {
        case "checkout.session.completed":
          if (!data.subscription) break;
          console.log(
            `[WEBHOOK] checkout.session.completed para cliente: ${data.customer}`
          );
          const subscriptionForCheckout = await getFreshSubscription(
            data.subscription
          );
          const { start, end } = resolveCurrentPeriod(
            subscriptionForCheckout,
            subscriptionForCheckout.latest_invoice
          );
          await updateUserSubscription(
            data.customer,
            data.subscription,
            "active",
            start,
            end
          );
          break;

        case "customer.subscription.created":
        case "customer.subscription.updated":
          try {
            const subscription = await getFreshSubscription(data.id);
            const { start, end } = resolveCurrentPeriod(
              subscription,
              subscription.latest_invoice
            );

            const user = await updateUserSubscription(
              subscription.customer,
              subscription.id,
              subscription.status,
              start,
              end
            );

            console.log(
              `[WEBHOOK] Assinatura ${event.type} atualizada: ${subscription.id}, status: ${subscription.status}`
            );

            if (event.type === "customer.subscription.created" && user) {
              console.log(
                `[WEBHOOK] Enviando e-mail de boas-vindas para: ${user.email}`
              );

              await transporter.sendMail({
                from: `"PetCare" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: "🎉 Bem-vindo ao PetCare!",
                html: generateWelcomeEmail(user.name),
              });
            }
          } catch (err) {
            console.error(
              `[WEBHOOK] Erro ao atualizar assinatura: ${err.message}`
            );
            return res.sendStatus(200);
          }
          break;

        case "invoice.paid":
        case "invoice.payment_succeeded":
          if (!data.subscription) break;
          console.log(
            `[WEBHOOK] Pagamento bem-sucedido para assinatura: ${data.subscription}`
          );
          const subscriptionInvoice = await getFreshSubscription(
            data.subscription
          );
          const { start: startInvoice, end: endInvoice } = resolveCurrentPeriod(
            subscriptionInvoice,
            data
          );
          await updateUserSubscription(
            subscriptionInvoice.customer,
            subscriptionInvoice.id,
            "active",
            startInvoice,
            endInvoice
          );
          break;

        case "invoice.payment_failed":
          console.warn(
            `[WEBHOOK] Pagamento falhou para cliente: ${data.customer}`
          );
          await User.findOneAndUpdate(
            { "subscription.stripeCustomerId": data.customer },
            { "subscription.status": "past_due" },
            { new: true }
          );
          break;

        case "customer.subscription.deleted":
          console.warn(`[WEBHOOK] Assinatura cancelada: ${data.id}`);
          await User.findOneAndUpdate(
            { "subscription.stripeSubscriptionId": data.id },
            { "subscription.status": "canceled" },
            { new: true }
          );
          break;

        default:
          console.log(`[WEBHOOK] Evento não tratado: ${event.type}`);
          break;
      }

      res.sendStatus(200);
    } catch (err) {
      console.error("[WEBHOOK] Erro inesperado:", err.message);
      res.sendStatus(200);
    }
  }
);

module.exports = webhookRouter;
