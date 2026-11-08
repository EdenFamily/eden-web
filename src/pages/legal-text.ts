/** Eden's Terms of Service and Privacy Policy (Eden Labs). Plain data; Legal.tsx renders it. */
export type LegalSection = { id: string; title: string; body: string[] };
export type LegalDoc = { title: string; updated: string; intro: string; sections: LegalSection[] };

const CONTACT = "support@edenfamily.xyz";
export const LEGAL_CONTACT = CONTACT;

export const TERMS: LegalDoc = {
  title: "Terms of Service",
  updated: "November 7, 2026",
  intro: "These Terms are an agreement between you and Eden Labs (\"Eden\", \"we\", \"us\") covering your use of edenfamily.xyz, its interfaces and related services (the \"Platform\"). Please read them carefully.",
  sections: [
    { id: "agreement", title: "Agreement", body: [
      "By accessing or using the Platform you accept these Terms and our Privacy Policy. If you do not agree, do not use the Platform.",
    ] },
    { id: "about", title: "About Eden", body: [
      "Eden is a software interface for launching, discovering and trading tokens on Elysium, a blockchain network operated by third parties. The interface helps you prepare transactions that you sign with your own wallet and that interact with public smart contracts.",
      "Eden does not operate Elysium, Uniswap or any wallet, and does not control the networks or contracts you interact with.",
    ] },
    { id: "eligibility", title: "Eligibility", body: [
      "You must be at least 18 years old, or the age of majority where you live if higher, and able to enter into a binding agreement.",
      "You may not use the Platform if you are located in, organized in, or ordinarily resident in a country or region subject to comprehensive sanctions (including Cuba, Iran, North Korea, Syria, Russia and the Crimea, Donetsk and Luhansk regions), if you are a sanctioned person, or if your use would break the law where you are. We may restrict access from any jurisdiction at our discretion.",
    ] },
    { id: "noncustodial", title: "A noncustodial interface", body: [
      "Eden never holds your assets or your keys, never executes transactions on your behalf, and cannot reverse, cancel or modify a transaction once you have signed it.",
      "Nothing on the Platform is investment, financial, legal or tax advice, and no information on the Platform is a recommendation to buy, sell or hold any token.",
    ] },
    { id: "wallets", title: "Wallets and security", body: [
      "You are responsible for your wallet, its private keys and recovery phrase, and every transaction signed with it. Eden will never ask for your private key or recovery phrase.",
      "We cannot recover lost keys or assets. Review every transaction in your wallet before you sign it.",
    ] },
    { id: "transactions", title: "Transactions", body: [
      "You review and authorize every transaction. Prices, quotes, market caps and other figures shown are estimates and can change before your transaction is confirmed.",
      "Blockchain transactions can fail, be delayed, be reordered or be confirmed at a different price than displayed, and they are generally irreversible. Transactions built by the interface may carry a marker in their data that identifies them as coming from Eden.",
    ] },
    { id: "launches", title: "Token launches and content", body: [
      "Anyone can create a token through the Platform. Creators are solely responsible for their tokens, names, tickers, images, descriptions, links and any statements they make about them.",
      "A token appearing on the Platform, being ranked, trending or labeled (for example as graduated or creator-verified) is not an endorsement by Eden. Information recorded on a public blockchain cannot be removed by us, though we may hide content from the interface.",
    ] },
    { id: "trading", title: "Trading, bonding curves and graduation", body: [
      "New tokens trade on a bonding curve and may graduate into a Uniswap pool according to the rules of the smart contracts at the time of launch. Launch protections, fees and graduation thresholds are set by those contracts and may differ between tokens.",
      "Tokens may be extremely volatile, illiquid or worthless. We do not guarantee liquidity, execution, graduation, or your ability to sell. Always verify the contract address of a token before trading.",
    ] },
    { id: "risks", title: "Risks", body: [
      "You may lose some or all of the assets you use with the Platform. Smart contracts, wallets, bridges, price data and networks can contain bugs, be exploited, halt or behave unexpectedly.",
      "Elysium is a new network. Its availability, rules and fees are controlled by third parties and may change. We make no representation about the legal or regulatory status of any token in any jurisdiction.",
    ] },
    { id: "fees", title: "Fees and taxes", body: [
      "You pay network fees and the fees set by the smart contracts you use, such as launch fees and trading fees, part of which may go to Eden and to token creators. Fees shown in the interface are estimates.",
      "You are solely responsible for determining and paying any taxes that apply to your activity.",
    ] },
    { id: "use", title: "Acceptable use", body: [
      "You agree not to use the Platform to break any law; to defraud or mislead others, including through false or impersonating token names, images or claims; to manipulate markets, including wash trading or coordinated pumps; to launder money or finance unlawful activity; to infringe the rights of others; or to interfere with, scrape at scale, or attack the Platform or its infrastructure.",
      "You may not use tokens launched through the Platform to offer securities, pooled investments, profit-sharing or equity-like rights.",
    ] },
    { id: "conflicts", title: "Our interests", body: [
      "Eden, its team and affiliates may hold, trade, launch or promote tokens, including tokens available on the Platform, and may earn fees from activity on the Platform. Using the Platform does not create a fiduciary or advisory relationship between you and Eden.",
    ] },
    { id: "limits", title: "Activity limits", body: [
      "We may limit the size, frequency or type of activity through the interface, including creator launch limits and referral eligibility, at our discretion.",
    ] },
    { id: "third-parties", title: "Third-party services", body: [
      "Wallets, networks, bridges, Uniswap, X, TikTok, IPFS hosting, price sources and other providers are independent of Eden. We do not control or endorse them, and their own terms and policies apply to your use of them.",
    ] },
    { id: "ip", title: "Intellectual property", body: [
      "Eden owns the Platform's interface, design, name and logos. We grant you a limited, revocable, nonexclusive license to use the interface for its intended purpose. Use of the Eden brand is governed by our brand kit.",
      `To report content you believe infringes your rights, email ${CONTACT} with the content's location, the work you believe is infringed, and your contact details.`,
    ] },
    { id: "content", title: "Content you submit", body: [
      "You keep the rights you have in the content you submit, such as token images and descriptions. You grant Eden a worldwide, nonexclusive, royalty-free license to host, store, display and distribute it in connection with the Platform. Content stored on public blockchains or IPFS may remain available permanently.",
      "You confirm you have the rights needed to submit that content and that it does not infringe anyone else's rights.",
    ] },
    { id: "feedback", title: "Feedback", body: [
      "If you send us ideas or suggestions, we may use them without restriction or compensation to you.",
    ] },
    { id: "availability", title: "Availability and changes", body: [
      "We may change, suspend or discontinue any part of the Platform at any time, with or without notice. The underlying smart contracts remain public, and you can interact with them directly without the Platform.",
    ] },
    { id: "warranties", title: "No warranties", body: [
      "The Platform is provided \"as is\" and \"as available\". To the fullest extent permitted by law, Eden disclaims all warranties, express or implied, including merchantability, fitness for a particular purpose, accuracy and non-infringement.",
    ] },
    { id: "liability", title: "Limitation of liability", body: [
      "To the fullest extent permitted by law, Eden and its team, affiliates and service providers are not liable for any indirect, incidental, special, consequential or punitive damages, or for any loss of profits, tokens, data or goodwill, arising from your use of the Platform.",
      "Our total liability for any claim relating to the Platform is limited to the greater of the fees you paid to Eden in the twelve months before the claim or US$100.",
    ] },
    { id: "indemnity", title: "Indemnification", body: [
      "You will defend, indemnify and hold Eden harmless from any claims, losses and costs arising from your use of the Platform, your tokens or content, or your breach of these Terms or of any law. You release Eden from claims arising from disputes between you and other users or third parties.",
    ] },
    { id: "termination", title: "Suspension and termination", body: [
      "We may restrict, suspend or end your access to the interface at any time, with or without notice, including where we suspect fraud, abuse, sanctions exposure or a breach of these Terms. Sections that by their nature should survive termination will survive.",
    ] },
    { id: "disputes", title: "Governing law and disputes", body: [
      "These Terms are governed by the laws of the jurisdiction in which Eden Labs is organized, without regard to conflict-of-law rules.",
      `Before bringing any claim, you agree to contact us at ${CONTACT} and try to resolve it informally for 60 days. Any dispute that remains will be resolved by binding individual arbitration, and you waive any right to bring or join a class or representative action. You may opt out of arbitration by emailing us within 30 days of first accepting these Terms.`,
    ] },
    { id: "general", title: "General", body: [
      "If any part of these Terms is unenforceable, the rest remains in effect. Our failure to enforce a provision is not a waiver. You may not assign these Terms without our consent; we may assign them. These Terms and the Privacy Policy are the entire agreement between you and Eden about the Platform.",
    ] },
    { id: "changes", title: "Changes to these Terms", body: [
      "We may update these Terms. We will show the date of the latest version at the top of this page and announce material changes through the Platform. Continuing to use the Platform after a change means you accept the updated Terms.",
    ] },
    { id: "contact", title: "Contact", body: [`Questions about these Terms: Eden Labs, ${CONTACT}.`] },
  ],
};

export const PRIVACY: LegalDoc = {
  title: "Privacy Policy",
  updated: "November 7, 2026",
  intro: "This policy explains how Eden Labs (\"Eden\", \"we\") handles information when you use edenfamily.xyz, its interface and related services (the \"Platform\"). Eden is a noncustodial interface: there are no accounts or passwords, you connect your own wallet, and we never hold your assets or keys.",
  sections: [
    { id: "about", title: "About this policy", body: [
      "This policy covers the information Eden processes through the Platform. It does not cover wallets, networks or other services you use alongside it, which have their own policies.",
    ] },
    { id: "collect", title: "Information we collect", body: [
      "Wallet and blockchain data: your wallet address, the signatures you provide to confirm actions (such as claiming a referral code or linking an account), transaction hashes and other public data on Elysium.",
      "Content you submit: token names, tickers, images, descriptions and links; referral codes; and, if you link them, your X or TikTok user ID, handle and display name.",
      "Communications: the emails you send to support and our replies.",
      "Device and network data: IP address, approximate location derived from it, browser and device type, and request logs.",
      "Local preferences: your theme and the wallet you last connected, stored in your browser.",
    ] },
    { id: "sources", title: "Sources of information", body: [
      "We get information from you, from your device and browser, from public blockchains, and from service providers such as wallets, RPC and indexing providers, IPFS gateways, X and TikTok (when you link an account) and public reputation services such as Ethos.",
    ] },
    { id: "use", title: "How we use information", body: [
      "To provide the Platform: show tokens, prices, trades, holders and portfolios; let you launch and trade tokens; connect wallets; display creator links; calculate and pay referral earnings; apply launch limits; moderate content shown in the interface; answer support requests; keep the Platform secure and prevent fraud and abuse; monitor performance; and meet legal obligations.",
    ] },
    { id: "bases", title: "Legal bases", body: [
      "Where the law requires a legal basis, we process information to provide the services you ask for, for our legitimate interests in running and securing the Platform, with your consent (for example when you link an account, which you can withdraw), and to comply with the law.",
    ] },
    { id: "blockchain", title: "Blockchain information", body: [
      "Transactions on Elysium are public and permanent, as are token images and metadata stored on IPFS. Eden cannot change or delete them. A linked X or TikTok handle is shown publicly on the tokens your wallet creates.",
    ] },
    { id: "disclose", title: "How we disclose information", body: [
      "We do not sell personal information. We share it with infrastructure providers that help us run the Platform (such as hosting, database, network, RPC and IPFS providers) under their terms or on our behalf; when required by law or to protect Eden, our users or the public; at your direction; or as part of a merger, acquisition or sale of assets.",
    ] },
    { id: "third-parties", title: "Third-party services", body: [
      "Wallets, Elysium, Uniswap, X, TikTok, Cloudflare, IPFS gateways, price sources and other services you use with the Platform are independent of Eden and handle your information under their own privacy policies.",
    ] },
    { id: "storage", title: "Browser storage", body: [
      "We use local storage for preferences and the wallet session, and a short-lived security cookie while you link an X or TikTok account. We do not use advertising cookies or targeted advertising.",
    ] },
    { id: "retention", title: "Retention", body: [
      "We keep offchain information only as long as needed for the purposes above, such as records needed for referrals, creator links and security. Information on public blockchains and distributed storage may persist indefinitely.",
    ] },
    { id: "security", title: "Security", body: [
      "We use reasonable safeguards to protect the information we hold, but no system is completely secure. Never share your private key or recovery phrase with anyone; Eden will never ask for them.",
    ] },
    { id: "international", title: "International processing", body: [
      "Our servers and providers may process information in countries other than yours, including the European Union and the United States, whose laws may differ from those where you live. We use safeguards where required.",
    ] },
    { id: "rights", title: "Your rights and choices", body: [
      `You can disconnect your wallet, clear your browser storage and keep personal details out of public fields. Depending on where you live, you may have rights to access, correct, delete or receive a copy of offchain information we hold, to object to or restrict certain processing, to withdraw consent, to appeal a denied request, and to complain to a data protection authority. Send requests to ${CONTACT}. We will not discriminate against you for exercising these rights. Onchain records cannot be changed.`,
    ] },
    { id: "us", title: "United States disclosures", body: [
      "Eden does not sell personal information or share it for cross-context behavioral advertising. Residents of some US states have rights to know, access, correct and delete personal information, which you can exercise by contacting us.",
    ] },
    { id: "children", title: "Children", body: [
      "The Platform is not directed to children, and we do not knowingly collect information from anyone under 18.",
    ] },
    { id: "changes", title: "Policy changes", body: [
      "We may update this policy. The date at the top shows the latest version, and we will communicate material changes through the Platform.",
    ] },
    { id: "contact", title: "Contact", body: [`Questions, privacy requests and complaints: Eden Labs, ${CONTACT}.`] },
  ],
};
