export type Language = "bn" | "en";

type Dict = Record<string, { bn: string; en: string }>;

/**
 * Central bilingual dictionary. Bangla is the primary language and is
 * written as natural, proofread Bangla rather than machine translation.
 */
export const dictionary = {
  brand: { bn: "মণিরামপুর ব্লাড নেটওয়ার্ক", en: "Manirampur Blood Network" },
  brandShort: { bn: "এমবিএন", en: "MBN" },
  tagline: { bn: "এক ব্যাগ রক্ত, একটি জীবন", en: "One bag of blood, one life" },
  serviceArea: { bn: "মণিরামপুর উপজেলা, যশোর", en: "Manirampur Upazila, Jashore" },
  developerCredit: { bn: "নির্মাণে: Zarif", en: "Developed by Zarif" },

  home: { bn: "হোম", en: "Home" },
  donors: { bn: "রক্তদাতা", en: "Donors" },
  requests: { bn: "রক্তের অনুরোধ", en: "Blood Requests" },
  notifications: { bn: "নোটিফিকেশন", en: "Notifications" },
  profile: { bn: "প্রোফাইল", en: "Profile" },
  settings: { bn: "সেটিংস", en: "Settings" },
  emergency: { bn: "জরুরি সেবা", en: "Emergency Services" },
  emergencyHelp: { bn: "জরুরি সহায়তা", en: "Emergency Help" },
  about: { bn: "পরিচিতি", en: "About" },
  logout: { bn: "লগআউট", en: "Log out" },
  login: { bn: "লগইন", en: "Sign in" },
  register: { bn: "নতুন অ্যাকাউন্ট", en: "Create account" },
  email: { bn: "ইমেইল", en: "Email" },
  password: { bn: "পাসওয়ার্ড", en: "Password" },
  bloodGroup: { bn: "রক্তের গ্রুপ", en: "Blood group" },
  donor: { bn: "রক্তদাতা", en: "Donor" },
  verifiedDonor: { bn: "যাচাইকৃত রক্তদাতা", en: "Verified donor" },
  available: { bn: "রক্তদানের জন্য উপলব্ধ", en: "Available to donate" },
  temporarilyUnavailable: { bn: "সাময়িকভাবে অনুপলব্ধ", en: "Temporarily unavailable" },
  notAvailable: { bn: "এই মুহূর্তে অনুপলব্ধ", en: "Not available" },
  sendRequest: { bn: "অনুরোধ পাঠান", en: "Send request" },
  viewNumber: { bn: "নম্বর দেখুন", en: "View number" },
  callDonor: { bn: "কল করুন", en: "Call donor" },
  report: { bn: "রিপোর্ট করুন", en: "Report" },
  loading: { bn: "ডেটা লোড হচ্ছে…", en: "Loading data…" },
  verifying: { bn: "যাচাই করা হচ্ছে…", en: "Verifying…" },
  sending: { bn: "অনুরোধ পাঠানো হচ্ছে…", en: "Sending request…" },
  sendingEmail: { bn: "ইমেইল পাঠানো হচ্ছে…", en: "Sending email…" },
  saving: { bn: "সংরক্ষণ করা হচ্ছে…", en: "Saving…" },
  retry: { bn: "আবার চেষ্টা করুন", en: "Retry" },
  cancel: { bn: "বাতিল", en: "Cancel" },
  confirm: { bn: "নিশ্চিত করুন", en: "Confirm" },
  accept: { bn: "গ্রহণ করুন", en: "Accept" },
  decline: { bn: "অগ্রাহ্য করুন", en: "Decline" },
  offlineTitle: { bn: "ইন্টারনেট সংযোগ নেই", en: "No Internet Connection" },
  offlineBody: {
    bn: "কোনো ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।",
    en: "We couldn’t connect to the internet. Please check your connection and try again.",
  },
  noDonors: { bn: "এই মুহূর্তে কোনো ডোনার পাওয়া যায়নি।", en: "No matching donors are currently available." },
  noRequests: { bn: "এই মুহূর্তে কোনো রক্তের অনুরোধ নেই।", en: "There are no blood requests right now." },
  noNotifications: { bn: "এই মুহূর্তে কোনো নোটিফিকেশন নেই।", en: "You have no notifications yet." },
  nextDonationDate: { bn: "সম্ভাব্য পরবর্তী রক্তদানের তারিখ", en: "Potential next donation date" },
  medicalDisclaimer: {
    bn: "প্রাথমিক তথ্য অনুযায়ী সম্ভাব্যভাবে উপযুক্ত হতে পারেন; চূড়ান্ত সিদ্ধান্ত সংশ্লিষ্ট চিকিৎসক/রক্ত সংগ্রহ কেন্দ্রের।",
    en: "Based on the available information, the donor may potentially meet preliminary criteria; final eligibility must be determined by the responsible medical professional/blood collection service.",
  },
  underVerification: { bn: "তথ্য যাচাইাধীন", en: "Information under verification" },
  enableNotifications: { bn: "নোটিফিকেশন চালু করুন", en: "Enable notifications" },
  notificationsBody: {
    bn: "নতুন রক্তের অনুরোধ, অনুরোধের আপডেট এবং জরুরি বিজ্ঞপ্তি সময়মতো পেতে নোটিফিকেশন চালু করুন।",
    en: "Turn on notifications to receive new blood requests, request updates and important emergency alerts.",
  },
  later: { bn: "পরে করব", en: "Maybe later" },
  privacy: { bn: "গোপনীয়তা নীতি", en: "Privacy policy" },
  terms: { bn: "ব্যবহারের শর্তাবলি", en: "Terms of service" },
} as const satisfies Dict;

export type DictionaryKey = keyof typeof dictionary;

export function t(key: DictionaryKey, language: Language): string {
  return dictionary[key][language];
}

export function bilingual(
  language: Language,
  bn: string,
  en: string,
): string {
  return language === "bn" ? bn : en;
}
