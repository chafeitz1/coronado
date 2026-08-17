// wa.me and tel: both want digits only (no spaces, dashes, parens, plus
// signs). For WhatsApp to resolve correctly the number must include the
// country code — we don't enforce that, just strip formatting and let
// WhatsApp fail gracefully on ambiguous numbers.
export function digitsOnly(phone: string) {
  return phone.replace(/\D/g, "");
}

export function telHref(phone: string) {
  return `tel:${digitsOnly(phone)}`;
}

export function whatsAppHref(phone: string) {
  return `https://wa.me/${digitsOnly(phone)}`;
}
