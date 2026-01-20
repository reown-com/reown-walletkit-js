export function isPaymentLink(uri: string): boolean {
  const lower = uri.toLowerCase();
  return (
    lower.includes("pay.") ||
    lower.includes("pay=") ||
    lower.includes("pay_") ||
    lower.includes("pay%2e") || // encoded "pay."
    lower.includes("pay%3d") || // encoded "pay="
    lower.includes("pay%5f") // encoded "pay_"
  );
}
