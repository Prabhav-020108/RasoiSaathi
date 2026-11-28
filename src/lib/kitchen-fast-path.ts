import { extractDateRef, keywordProcess, type KnownCustomerRef, type ParsedCommand } from "./voice-fallback";

export function kitchenFastPath(text: string, customers: KnownCustomerRef[]): ParsedCommand | null {
  const append = text.match(/^(?:please )?add (.+?) (?:to|in) (?:the )?(?:tomorrow(?:'s|’s|s)? )?menu[.!]?$/i)
    ?? text.match(/^(?:कल के मेनू में|kal ke menu mein)\s+(.+?)\s+(?:जोड़ो|जोड़ दो|शामिल करो|add karo)[।.!]?$/i)
    ?? text.match(/^ನಾಳೆಯ ಮೆನುವಿಗೆ\s+(.+?)\s+ಸೇರಿಸಿ[.!]?$/);
  if (append) return { intent: "menu_broadcast", entities: { menuText: append[1], appendMenu: true }, confidence: 1 };
  const menu = text.match(/^(?:(?:tomorrow(?:'s|’s|s)?|kal ka|कल का|ನಾಳೆಯ)\s+)?(?:menu|मेनू|ಮೆನು)\s*[:：-]\s*(.+)$/i);
  if (menu) return { intent: "menu_broadcast", entities: { menuText: menu[1] }, confidence: 1 };

  if (/^(?:(?:please )?(?:send|message|msg|text|prepare)(?: (?:them|everyone|all customers))? (?:a )?(?:payment )?reminders?|remind (?:them|everyone)(?: about payment)?|सबको (?:भुगतान की )?याद दिलाओ|ಅವರಿಗೆ ನೆನಪಿಸಿ)[.!।]?$/i.test(text)) {
    return { intent: "payment_remind", entities: {}, confidence: 1 };
  }
  if (/^(?:how many (?:jain )?tiffins?\b|(?:today|tomorrow)(?:'s)? tally\b|aaj kitne tiffin\b|(?:आज|कल) कितने टिफ़?िन|(?:ಇಂದು|ನಾಳೆ) ಎಷ್ಟು ಟಿಫಿನ್)/i.test(text)) {
    return { intent: "tally", entities: { date: extractDateRef(text) }, confidence: 1 };
  }
  const basic = keywordProcess(text, customers);
  if (basic.intent === "payment_check" &&
      /^(?:who (?:hasn.t paid|still owes|has pending)|(?:show|read|list) (?:my )?pending payments|pending payments|kisne payment nahi|किसका भुगतान बाकी|किसने भुगतान नहीं|ಯಾರು ಪಾವತಿ ಮಾಡಿಲ್ಲ|ಯಾರ ಪಾವತಿ ಬಾಕಿ)/i.test(text)) return basic;
  return null;
}
