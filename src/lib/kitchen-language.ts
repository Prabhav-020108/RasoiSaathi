const english = {
  start: "Start Kitchen Mode",
  stop: "Stop Kitchen Mode",
  waiting: "Say RasoiSaathi",
  resume: "Resume Kitchen Mode",
  listening: "I'm listening.",
  ready: "Kitchen Mode is ready. Say RasoiSaathi.",
  retry: "Please say that again.",
  failed: "I couldn't complete that. Check the app and try again.",
  stopped: "Kitchen Mode stopped.",
  cancelled: "Okay, cancelled.",
  empty: "No more messages to read.",
  unavailable: "Translation is unavailable.",
  approve: "Say yes to approve, or no to leave it pending.",
  savedReply: "Reply saved for review.",
  dictate: "Say your reply now.",
  pending: "The request is still pending.",
  newMessage: "Message from",
  voiceUnavailable: "A voice for this language is unavailable on this phone.",
  disclosure: "Keep this screen visible. Your browser may use an online speech service.",
};

const copy: Record<string, typeof english> = {
  en: english,
  hi: {
    start: "किचन मोड शुरू करें", stop: "किचन मोड बंद करें", waiting: "रसोई साथी कहें", resume: "किचन मोड फिर शुरू करें",
    listening: "बोलिए, मैं सुन रही हूँ।", ready: "किचन मोड तैयार है। रसोई साथी कहें।",
    retry: "कृपया फिर से कहें।", failed: "काम पूरा नहीं हुआ। ऐप देखकर फिर कोशिश करें।",
    stopped: "किचन मोड बंद है।", cancelled: "ठीक है, रद्द किया।", empty: "पढ़ने के लिए और संदेश नहीं हैं।",
    unavailable: "अनुवाद उपलब्ध नहीं है।", approve: "मंज़ूरी के लिए हाँ कहें, या बाद के लिए नहीं कहें।",
    savedReply: "जवाब समीक्षा के लिए सहेजा गया।", dictate: "अब अपना जवाब बोलें।", pending: "अनुरोध अभी बाकी है।",
    newMessage: "इनका संदेश है", voiceUnavailable: "इस फ़ोन पर इस भाषा की आवाज़ उपलब्ध नहीं है।",
    disclosure: "स्क्रीन खुली रखें। ब्राउज़र ऑनलाइन वाणी सेवा इस्तेमाल कर सकता है।",
  },
  kn: {
    start: "ಅಡುಗೆ ಮೋಡ್ ಆರಂಭಿಸಿ", stop: "ಅಡುಗೆ ಮೋಡ್ ನಿಲ್ಲಿಸಿ", waiting: "ರಸೋಯಿ ಸಾಥಿ ಎಂದು ಹೇಳಿ", resume: "ಅಡುಗೆ ಮೋಡ್ ಮತ್ತೆ ಆರಂಭಿಸಿ",
    listening: "ಹೇಳಿ, ಕೇಳುತ್ತಿದ್ದೇನೆ.", ready: "ಅಡುಗೆ ಮೋಡ್ ಸಿದ್ಧವಾಗಿದೆ. ರಸೋಯಿ ಸಾಥಿ ಎಂದು ಹೇಳಿ.",
    retry: "ದಯವಿಟ್ಟು ಮತ್ತೆ ಹೇಳಿ.", failed: "ಕೆಲಸ ಮುಗಿಯಲಿಲ್ಲ. ಆಪ್ ನೋಡಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    stopped: "ಅಡುಗೆ ಮೋಡ್ ನಿಲ್ಲಿಸಲಾಗಿದೆ.", cancelled: "ಸರಿ, ರದ್ದು ಮಾಡಿದೆ.", empty: "ಓದಲು ಇನ್ನೂ ಸಂದೇಶಗಳಿಲ್ಲ.",
    unavailable: "ಅನುವಾದ ಲಭ್ಯವಿಲ್ಲ.", approve: "ಒಪ್ಪಲು ಹೌದು ಎಂದು ಹೇಳಿ, ಮುಂದೂಡಲು ಬೇಡ ಎಂದು ಹೇಳಿ.",
    savedReply: "ಪರಿಶೀಲನೆಗಾಗಿ ಉತ್ತರ ಉಳಿಸಲಾಗಿದೆ.", dictate: "ಈಗ ನಿಮ್ಮ ಉತ್ತರ ಹೇಳಿ.", pending: "ವಿನಂತಿ ಇನ್ನೂ ಬಾಕಿಯಿದೆ.",
    newMessage: "ಇವರಿಂದ ಸಂದೇಶ", voiceUnavailable: "ಈ ಫೋನ್‌ನಲ್ಲಿ ಈ ಭಾಷೆಯ ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲ.",
    disclosure: "ಪರದೆಯನ್ನು ತೆರೆದಿಡಿ. ಬ್ರೌಸರ್ ಆನ್‌ಲೈನ್ ಧ್ವನಿ ಸೇವೆ ಬಳಸಬಹುದು.",
  },
  ta: {
    start: "சமையல் பயன்முறையைத் தொடங்கு", stop: "சமையல் பயன்முறையை நிறுத்து", waiting: "ரசோய் சாத்தி என்று சொல்லுங்கள்", resume: "சமையல் பயன்முறையை மீண்டும் தொடங்கு",
    listening: "சொல்லுங்கள், கேட்கிறேன்.", ready: "சமையல் பயன்முறை தயார். ரசோய் சாத்தி என்று சொல்லுங்கள்.",
    retry: "மீண்டும் சொல்லுங்கள்.", failed: "முடிக்க முடியவில்லை. செயலியைப் பார்த்து மீண்டும் முயலுங்கள்.",
    stopped: "சமையல் பயன்முறை நிறுத்தப்பட்டது.", cancelled: "சரி, ரத்து செய்யப்பட்டது.", empty: "படிக்க வேறு செய்திகள் இல்லை.",
    unavailable: "மொழிபெயர்ப்பு கிடைக்கவில்லை.", approve: "ஒப்புக்கொள்ள ஆம் என்றும் ஒத்திவைக்க வேண்டாம் என்றும் சொல்லுங்கள்.",
    savedReply: "பதில் சரிபார்ப்புக்காகச் சேமிக்கப்பட்டது.", dictate: "இப்போது உங்கள் பதிலைச் சொல்லுங்கள்.", pending: "கோரிக்கை நிலுவையில் உள்ளது.",
    newMessage: "இவரிடமிருந்து செய்தி", voiceUnavailable: "இந்த மொழிக்கான குரல் இந்தத் தொலைபேசியில் இல்லை.",
    disclosure: "திரையைத் திறந்து வையுங்கள். உலாவி இணையக் குரல் சேவையைப் பயன்படுத்தலாம்.",
  },
  te: {
    start: "వంట మోడ్ ప్రారంభించండి", stop: "వంట మోడ్ ఆపండి", waiting: "రసోయి సాథి అని చెప్పండి", resume: "వంట మోడ్ మళ్లీ ప్రారంభించండి",
    listening: "చెప్పండి, వింటున్నాను.", ready: "వంట మోడ్ సిద్ధం. రసోయి సాథి అని చెప్పండి.",
    retry: "దయచేసి మళ్లీ చెప్పండి.", failed: "పని పూర్తి కాలేదు. యాప్ చూసి మళ్లీ ప్రయత్నించండి.",
    stopped: "వంట మోడ్ ఆపబడింది.", cancelled: "సరే, రద్దు చేశాను.", empty: "చదవడానికి మరిన్ని సందేశాలు లేవు.",
    unavailable: "అనువాదం అందుబాటులో లేదు.", approve: "ఆమోదించడానికి అవును, వాయిదా వేయడానికి వద్దు అని చెప్పండి.",
    savedReply: "సమీక్ష కోసం జవాబు సేవ్ అయింది.", dictate: "ఇప్పుడు మీ జవాబు చెప్పండి.", pending: "అభ్యర్థన ఇంకా పెండింగ్‌లో ఉంది.",
    newMessage: "వీరి సందేశం", voiceUnavailable: "ఈ ఫోన్‌లో ఈ భాషకు స్వరం అందుబాటులో లేదు.",
    disclosure: "స్క్రీన్ తెరిచి ఉంచండి. బ్రౌజర్ ఆన్‌లైన్ వాయిస్ సేవను ఉపయోగించవచ్చు.",
  },
  mr: {
    start: "स्वयंपाक मोड सुरू करा", stop: "स्वयंपाक मोड बंद करा", waiting: "रसोई साथी म्हणा", resume: "स्वयंपाक मोड पुन्हा सुरू करा",
    listening: "बोला, मी ऐकत आहे.", ready: "स्वयंपाक मोड तयार आहे. रसोई साथी म्हणा.",
    retry: "कृपया पुन्हा सांगा.", failed: "काम पूर्ण झाले नाही. ॲप पाहून पुन्हा प्रयत्न करा.",
    stopped: "स्वयंपाक मोड बंद केला.", cancelled: "ठीक आहे, रद्द केले.", empty: "वाचायला आणखी संदेश नाहीत.",
    unavailable: "भाषांतर उपलब्ध नाही.", approve: "मंजुरीसाठी हो, पुढे ढकलण्यासाठी नको म्हणा.",
    savedReply: "उत्तर तपासणीसाठी जतन केले.", dictate: "आता तुमचे उत्तर सांगा.", pending: "विनंती अजून प्रलंबित आहे.",
    newMessage: "यांचा संदेश", voiceUnavailable: "या फोनवर या भाषेचा आवाज उपलब्ध नाही.",
    disclosure: "स्क्रीन उघडी ठेवा. ब्राउझर ऑनलाइन वाणी सेवा वापरू शकतो.",
  },
};

export function kitchenCopy(lang: string) {
  return copy[lang] ?? english;
}

export function wakeCommand(text: string): string | null {
  const match = text.normalize("NFC").trim().match(
    /^(?:(?:hey|ok(?:ay)?)[\s,.]+)?(?:rasoi\s*saa?thi|रसो[ईइ]\s*साथी|ರ[ಸಶ]ೋ[ಯಇಯಿ]*\s*ಸಾ[ತಥ]ಿ|ரசோய்?\s*சாத்தி|రసోయి?\s*సాథి)(?=$|[\s,.:!?।])/i
  );
  return match ? text.normalize("NFC").trim().slice(match[0].length).replace(/^[\s,.:!?।]+/, "").trim() : null;
}

const phrases = {
  yes: /^(yes|approve|confirm|हाँ|हां|मंज़ूर|ಹೌದು|ಒಪ್ಪಿಗೆ|ஆம்|சரி|అవును|సరే|हो|मंजूर)$/i,
  no: /^(no|cancel|skip for now|नहीं|रद्द|ಬೇಡ|ರದ್ದು|இல்லை|வேண்டாம்|వద్దు|కాదు|नको)$/i,
  next: /^(next|अगला|ಮುಂದಿನದು|அடுத்து|తర్వాత|पुढचा)$/i,
  repeat: /^(repeat|say that again|फिर से|दोहराओ|ಮತ್ತೆ ಹೇಳಿ|மீண்டும்|మళ్లీ చెప్పండి|पुन्हा सांगा)$/i,
  stop: /^(stop kitchen mode|किचन मोड बंद करो|ಅಡುಗೆ ಮೋಡ್ ನಿಲ್ಲಿಸಿ|சமையல் பயன்முறையை நிறுத்து|వంట మోడ్ ఆపండి|स्वयंपाक मोड बंद करा)$/i,
  messages: /^(?:read (?:my )?messages|read whatsapp|whatsapp messages|संदेश पढ़ो|मैसेज पढ़ो|ಸಂದೇಶಗಳನ್ನು ಓದಿ|செய்திகளைப் படி|సందేశాలు చదవండి|संदेश वाचा)$/i,
  reply: /^(?:reply|dictate a reply|जवाब|ಉತ್ತರ|பதில்|జవాబు|उत्तर)$/i,
  edit: /^(?:edit|correct|change it|बदलें|ಬದಲಿಸಿ|மாற்று|మార్చండి|बदला)$/i,
  tomorrow: /^(?:and tomorrow|tomorrow|कल|ನಾಳೆ|நாளை|రేపు|उद्या)$/i,
  menu: /^(?:read (?:the |tomorrow's )?menu|what is tomorrow's menu|मेनू पढ़ो|ಮೆನು ಓದಿ|மெனுவைப் படி|మెనూ చదవండి|मेनू वाचा)$/i,
};

export function kitchenControl(text: string) {
  const command = text.normalize("NFC").trim().replace(/[.!?।…]+$/, "");
  return (Object.keys(phrases) as Array<keyof typeof phrases>).find((key) => phrases[key].test(command));
}
