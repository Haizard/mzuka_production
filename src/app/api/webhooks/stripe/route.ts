import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.payment_status === "paid") {
          const { bookingId, paymentId, userId } = session.metadata || {};

          if (!paymentId || !bookingId) {
            console.error("Missing metadata in checkout session");
            break;
          }

          // Update payment status to PAID
          await prisma.payment.update({
            where: { id: paymentId },
            data: {
              status: "PAID",
              stripePaymentIntent: session.payment_intent as string,
            },
          });

          // Update booking payment status
          const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { payments: true, package: true },
          });

          if (booking) {
            const totalPaid = booking.payments.reduce(
              (sum, p) => (p.status === "PAID" ? sum + p.amountCents : sum),
              0
            );

            const packagePrice = booking.package?.priceCents || 0;
            const newPaymentStatus =
              totalPaid >= packagePrice ? "PAID" : "DEPOSIT_PAID";

            await prisma.booking.update({
              where: { id: bookingId },
              data: { paymentStatus: newPaymentStatus },
            });

            // Log the payment
            await prisma.auditLog.create({
              data: {
                actorId: userId,
                action: "PAYMENT_RECEIVED",
                entity: "Payment",
                entityId: paymentId,
                metadata: {
                  bookingId,
                  amount: (totalPaid / 100).toFixed(2),
                  status: newPaymentStatus,
                },
              },
            });
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { paymentId } = session.metadata || {};

        if (paymentId) {
          // Mark payment as failed
          await prisma.payment.update({
            where: { id: paymentId },
            data: { status: "FAILED" },
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;

        // Find payment by payment intent
        const payment = await prisma.payment.findFirst({
          where: {
            stripePaymentIntent: charge.payment_intent as string,
          },
        });

        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "REFUNDED" },
          });

          // Update booking payment status
          const booking = await prisma.booking.findUnique({
            where: { id: payment.bookingId },
            include: { payments: true },
          });

          if (booking) {
            const totalPaid = booking.payments.reduce(
              (sum, p) =>
                p.id !== payment.id && p.status === "PAID"
                  ? sum + p.amountCents
                  : sum,
              0
            );

            const newPaymentStatus =
              totalPaid === 0 ? "UNPAID" : "DEPOSIT_PAID";

            await prisma.booking.update({
              where: { id: booking.id },
              data: { paymentStatus: newPaymentStatus },
            });
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response("Webhook processed", { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
}
