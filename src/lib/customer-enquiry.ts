export function isTiffinEnquiry(text: string): boolean {
  if (/\b(?:cancel|skip|pause|unsubscribe|stop sending|mat bhejna|nahi chahiye)\b|रद्द|बंद|मत भेज|नहीं चाहिए|ಬೇಡ|ರದ್ದು/i.test(text)) return false;
  return /\b(?:want|would like|looking|interested|can i|how (?:can|do) i|wish)\b.{0,65}\b(?:subscribe|join|start|tiffin|meal plan)\b|\b(?:fees?|prices?|rates?|cost)\b.{0,30}\b(?:tiffin|meal plan)\b|(?:टिफ़?िन|डब्बा).{0,24}(?:शुरू|लगवाना|चाहिए|सदस्य)|(?:tiffin|dabba).{0,24}(?:shuru|start|chahiye|lagwana)|(?:ಟಿಫಿನ್|ಊಟ).{0,24}(?:ಬೇಕು|ಪ್ರಾರಂಭ|ಸೇರ)/i.test(text);
}

export function enquiryDetails(lang: string, price: number, menu?: string) {
  const info = ({
    en: { lead: "New tiffin enquiry.", fee: `The monthly fee is ₹${price}.`, menu: "Current menu", next: "Please share your preferred start date and delivery address." },
    hi: { lead: "टिफ़िन सेवा के लिए नई पूछताछ है।", fee: `टिफ़िन सेवा की मासिक फीस ₹${price} है।`, menu: "मेनू", next: "कृपया शुरू करने की तारीख और डिलीवरी का पता बताइए।" },
    kn: { lead: "ಟಿಫಿನ್ ಸೇವೆಗೆ ಹೊಸ ವಿಚಾರಣೆ ಬಂದಿದೆ.", fee: `ಟಿಫಿನ್ ಸೇವೆಯ ಮಾಸಿಕ ಶುಲ್ಕ ₹${price}.`, menu: "ಮೆನು", next: "ದಯವಿಟ್ಟು ಆರಂಭದ ದಿನಾಂಕ ಮತ್ತು ವಿತರಣಾ ವಿಳಾಸ ತಿಳಿಸಿ." },
    ta: { lead: "டிபன் சேவைக்கு புதிய விசாரணை.", fee: `மாதக் கட்டணம் ₹${price}.`, menu: "மெனு", next: "தொடங்கும் தேதியையும் விநியோக முகவரியையும் தெரிவியுங்கள்." },
    te: { lead: "టిఫిన్ సేవకు కొత్త విచారణ.", fee: `నెలవారీ రుసుము ₹${price}.`, menu: "మెనూ", next: "ప్రారంభ తేదీ, డెలివరీ చిరునామా తెలియజేయండి." },
    mr: { lead: "डबा सेवेसाठी नवीन चौकशी आली आहे.", fee: `मासिक शुल्क ₹${price} आहे.`, menu: "मेनू", next: "कृपया सुरुवातीची तारीख आणि डिलिव्हरीचा पत्ता कळवा." },
  })[lang];
  if (!info) return enquiryDetails("en", price, menu);
  const details = `${info.fee}${menu ? ` ${info.menu} — ${menu}.` : ""} ${info.next}`;
  return { lead: info.lead, reply: details };
}
