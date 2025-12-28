export const isWebhookDuplicate = ({
  paymentExists,
  appointmentStatus,
}: {
  paymentExists: boolean;
  appointmentStatus: string | null;
}) => {
  return paymentExists && appointmentStatus === "booked";
};
