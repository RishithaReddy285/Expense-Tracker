export const categories = ["Food", "Transport", "Shopping", "Housing", "Utilities", "Health", "Entertainment", "Travel", "Education", "Other"];
export const paymentMethods = ["Cash", "Credit Card", "Debit Card", "UPI", "Bank Transfer", "Wallet"];
export const recurrences = ["None", "Weekly", "Monthly", "Yearly"];

export const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
