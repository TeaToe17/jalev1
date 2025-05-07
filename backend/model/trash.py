# failing at these

#     Message: Here’s my number, 9876543210.
# Classification: contact exchange (confidence: 0.4721)

# Message: I saw a similar product for a lower price, can you match it?
# Classification: negotiation (confidence: 0.4964)

# Message: My address is 123 Main St.
# Classification: address exchange (confidence: 0.4650)

# Message: Let’s talk about a better deal.
# Classification: address exchange (confidence: 0.5129)

# Message: Here’s my number, 9876543210.
# Classification: contact exchange (confidence: 0.4721)

# Message: I saw a similar product for a lower price, can you match it?
# Classification: negotiation (confidence: 0.4964)

# Message: My address is 123 Main St.
# Classification: address exchange (confidence: 0.4650)

# Message: Here’s my number, 9876543210.
# Classification: contact exchange (confidence: 0.4721)


# Message: Here’s my number, 9876543210.
# Classification: contact exchange (confidence: 0.4721)

# Message: Here’s my number, 9876543210.




# contact_hints = [
#     "real one is", "hit me up", "reach me", "whatsapp me", "text me", "call me",
#     "number is", "contact me", "send me a message", "drop me a message", "ping me",
#     "DM me", "my handle is", "email me", "email is", "telegram", "IG", "profile", "bio"
# ]

# def has_suggestive_phrase(text):
#     return any(phrase in text.lower() for phrase in contact_hints)

# def has_long_number(text, threshold=8):
#     return bool(re.search(r'\d{' + str(threshold) + r',}', text))

# def detect_contact_exchange(message):
#     labels = ["contact exchange", "general chat"]
#     result = classifier(message, candidate_labels=labels)
#     return result["labels"][0] == "contact exchange"

    # if result["labels"][0] != "contact exchange":
    #     if (has_long_number(message) and has_suggestive_phrase(message)):
    #         result["labels"] = ["contact exchange", "general chat"]

# for message in messages:
#     if detect_contact_exchange(message):
#         print("Message blocked: Contact exchange detected.")
#     else:
#         print("Message sent successfully.", message)

# Example messages
# messages = [
#     "Can you lower the price?",
#     "Here’s my number, 9876543210.",
#     "I saw a similar product for a lower price, can you match it?",
#     "My address is 123 Main St.",
#     "Let’s talk about a better deal.",
#     "I’m ready to buy now if you can offer a discount.",
#     "Call me at 9876543210."
# ]

# messages = [
#     "Can you give me a discount on that?",
#     "Is that the best price you can offer?",
#     "How about we meet halfway on the price?",
#     "I’m interested, but can you lower the price a bit?",
#     "What’s your final price for this?",
#     "I can pay this much, can you accept?",
#     "I saw a similar product for less elsewhere. Can you beat that price?",
#     "Can you offer me a special deal on this?",
#     "What’s your best offer for this?",
#     "Is there any chance of a price reduction?",
#     "I’m ready to buy now, but only if the price drops a bit.",
#     "If I buy in bulk, can you offer a better price?",
#     "Would you take this as a payment instead?",
#     "Could we do a better price if I pay in cash?",
#     "Can you throw in free shipping if we settle at this price?",
#     "How low are you willing to go on this?",
#     "What’s the lowest you can do for me?",
#     "I was thinking of something closer to this price range, is that possible?",
#     "Is there any flexibility in the price?",
#     "Can you match the price I found elsewhere?",
#     "Can you offer a discount for repeat business?",
#     "I’m really interested, but it’s a bit over my budget.",
#     "If I buy more, can I get a better deal?",
#     "Can you reduce the price by 10%?",
#     "I’m willing to pay immediately if you lower the price by X amount.",
#     "How much discount can you offer for this item?",
#     "Could you make a better deal for a loyal customer?",
#     "What’s the best price you’ve given to someone for this?",
#     "I can only afford this much, are you open to negotiating?",
#     "I’m looking for something cheaper, but I like this one. Can you lower the price?",
#     "Can we work out a deal on the price?",
#     "I’ve seen lower prices online. Can you adjust?"
# ]

# messages = [
#     "Here's my WhatsApp number: 9876543210",
#     "Text me at 9876543210",
#     "Call me on 9876543210",
#     "My number is 9876543210",
#     "WhatsApp: 9876543210",
#     "DM me on WhatsApp, 9876543210",
#     "Ping me at 9876543210",
#     "Contact: 9876543210",
#     "Reach me on 9876543210",
#     "I'm on WhatsApp at 9876543210",
#     "My number is 987 654 3210",
#     "My number is 987-654-3210",
#     "My number is 98 76 54 32 10",
#     "My WhatsApp is 98*76*54*32*10",
#     "WhatsApp me at nine eight seven six five four three two one zero",
#     "WhatsApp me at 98seven65four3210",
#     "You can reach me at 987-dot-654-dot-3210",
#     "WhatsApp me: 9eight7-six5four-321zero",
#     "Hit me up at: 987 _ 654 _ 3210",
#     "987␣654␣3210 – message me there",
#     "Email me at john.doe@gmail.com",
#     "Hit me up on john[at]gmail[dot]com",
#     "john.doe (at) gmail dot com",
#     "Mail me: john{at}gmail{dot}com",
#     "Send a mail to johndoe123 [at] gmail dot com",
#     "Let's talk: j.doe[at]email.com",
#     "Reach out to john.doe at gmail",
#     "Email: john dot doe at gmail",
#     "My email: johndoe at gmail dot com",
#     "Contact via email – j_doe at g mail",
#     "Find me on Instagram @johndoe_123",
#     "My Telegram is @johndoe",
#     "DM me on IG: @doe.john",
#     "Check my bio for contact info",
#     "Go to my profile for number",
#     "Let’s connect on Telegram",
#     "Check my username here, same on WhatsApp",
#     "Hit me up on my IG handle",
#     "Same username on WhatsApp, just search",
#     "You’ll find my contact on my profile",
#     "int phone = 9876543210;",
#     "0102 3456 789 – WhatsApp 😉",
#     "0123456789[::-1] # Just reverse it",
#     "0x3ADE68B2 – hex for something?",
#     "My contact: \"zero nine eight seven six five four three two one\" (backwards)",
#     "Drop me a msg @ 0987*654*3210",
#     "01189998819991197253 – jk, real one is simpler",
#     "decode('OTg3NjU0MzIxMA==')", 
# ]


import os
import django
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# print(os.path.dirname(__file__))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from datasets import load_dataset #noqa E402

from transformers import RobertaTokenizer, RobertaForSequenceClassification, Trainer, TrainingArguments #noqa E402

if __name__ == "__main__":
    import multiprocessing #noqa
    multiprocessing.set_start_method("spawn", force=True)
    # import torch

    # Label mappings
    label2id = {
        "contact exchange": 0,
        "address exchange": 1,
        "negotiation": 2,
        "general chat": 3,
    }
    id2label = {v: k for k, v in label2id.items()}

    # Load dataset
    dataset = load_dataset("csv", data_files="model/messages.csv")

    # Encode labels
    def encode_labels(example):
        example["label"] = label2id[example["label"]]
        return example

    dataset = dataset.map(encode_labels)

    # Load tokenizer for roberta-large-mnli
    tokenizer = RobertaTokenizer.from_pretrained("roberta-large")

    # Tokenize messages
    def tokenize_function(example):
        return tokenizer(example["text"], padding="max_length", truncation=True)

    tokenized_datasets = dataset.map(tokenize_function, batched=True)

    # Load model
    model = RobertaForSequenceClassification.from_pretrained(
        "roberta-large",
        num_labels=4,
        id2label=id2label,
        label2id=label2id,
    )

    # Training arguments
    training_args = TrainingArguments(
        output_dir="./results",
        # evaluation_strategy="epoch",
        eval_strategy="epoch",
        save_strategy="epoch",
        learning_rate=2e-5,
        per_device_train_batch_size=8,
        per_device_eval_batch_size=8,
        num_train_epochs=3,
        weight_decay=0.01,
        load_best_model_at_end=True,
        logging_dir="./logs",
        dataloader_pin_memory=False,  # Important on Windows
    )

    # Trainer setup
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_datasets["train"],
        eval_dataset=tokenized_datasets["train"],  # Replace with val split if available
        tokenizer=tokenizer,
    )

    # Train the model
    trainer.train()

    # Save the fine-tuned model
    model_path = "./my-roberta-mnli-finetuned"
    trainer.save_model(model_path)

    # 4. Example usage
# test_messages = [
#     "Bro abeg you fit plug me with your roomie’s number? I dey find one babe wey stay Moremi.",
#     "Hey, what time is your exam tomorrow? We can revise in the common room tonight.",
#     "Congrats! You have been selected for a ₦200,000 scholarship. Send your account number now!",
#     "Omo this power outage don tire me. Generator dey for your block?",
#     "Please I forgot my phone charger in B103, can someone check for me?",
#     "Hi, it’s Sam from Biochemistry class. You left your lab coat in the hostel common area.",
#     "You won 2GB MTN data for free. Click here to redeem: unilag-mtn-data.ng/redeem",
#     "Slide me your hostel room number. I wan deliver something small for you.",
#     "I just dey finish lecture. Hope say food still dey for cafeteria?",
#     "Abeg if you see a pink iPhone charger around Fagunwa, it’s mine.",
#     "URGENT: Reset your Unilag portal password now. Click: unilag-helpcenter.me/secure",
#     "Make we link up for night class by 7pm, I get past questions to share.",
#     "Can I borrow your gas cylinder for tonight? I wan cook beans.",
#     "Hmmm, this guy say make I send my WhatsApp number to ‘verify’ hostel allocation. Na scam?",
#     "Pls I’m locked outside Mariere. Can you come help open?",
#     "My guy, I just saw your crush near the Amphi, you dey miss!",
#     "Your JAMB profile has an error. Kindly send your NIN and date of birth for correction.",
#     "Wahala no too much if you get steady light. Wish I dey New Hall.",
#     "I wan enter your room come gist you about this new hustle, sure plug!",
#     "Lecture don cancel oh! Make we bounce go relax for your room.",
#     "Hello dear, kindly send me your hostel address. I want to surprise you ❤️",
#     "This one wey mosquito full room like this, you get insecticide spray?",
#     "Collect ₦5,000 for completing a short Unilag survey. Apply now: students-cashout.ng",
#     "You dey around hostel? I need help lifting my water keg.",
#     "Babe you fine die! Drop your number make we vibe sometime.",
#     "Guy I get shawarma plug near gate, you wan try?",
#     "Just go your room, you get birthday package waiting!",
#     "Have you seen my water flask? I think I left it in A308.",
#     "Oya na, send me the location of your hostel make I enter.",
#     "You too fine to be walking alone. Send your number babe.",
#     "Free hostel cleaning services for first 50 people. Register at hostel-cleanpro.org.ng",
#     "This your DP eh, you wan make person catch feelings?",
#     "Block C no get water again. I wan come fetch from your place.",
#     "Hi, it’s Daniel from CITS. I need your password to fix your WiFi issue.",
#     "Come downstairs, we dey do small hangout near your block.",
#     "You left your bucket in the tap area again 😂",
#     "URGENT: Your school email has been compromised. Click to recover: mail.unilag-support.cc",
#     "Let’s watch Champions League at my block, bring malt if you fit.",
#     "Hi fine girl, drop number na. You dey form too much.",
#     "I dey go CMS tomorrow, you wan make I help you buy anything?",
#     "Make we chill this weekend. My room dey always get light 😉",
#     "Quick one: send me your exam card and ID. I go help you register class.",
#     "Come to Jaja kitchen by 6pm, food go land.",
#     "Are you in the room? I need pad urgently abeg.",
#     "They just stole someone’s phone in Fagunwa again. Lock your door oh.",
#     "Your parcel has arrived. Send hostel and phone number to receive.",
#     "Wetin happen? I no see you for morning devotion today.",
#     "Make you no dull! Free crypto training this weekend for Unilag students only. Link: earncrypto.unilag.codes",
#     "We fit use your bed space for just tonight? My guy no get where to crash.",
#     "Can you borrow me your hot plate? I go return am before night.",
#     "Your girl just passed my hostel oh, she dey para.",
#     "You get 1k urgent? I go pay back next week.",
#     "I dey hostel already, where you dey?",
#     "You dey room? Make I stop by for just 5 minutes.",
#     "Send me your WhatsApp number I fit link you up with scholarship palz.",
#     "We dey play FIFA tournament for common room, come flex!",
#     "Please drop your contact, I forgot to get it after class.",
#     "Are you around to help me with this CBT stuff?",
#     "Don’t trust that site o. They just dey collect people’s login.",
#     "You wan do assignment together this evening?",
#     "Please I’m new in this hostel, can I get a tour?",
#     "You fit escort me go St. Dominic junction later?",
#     "I just saw you at the tap and couldn’t help but ask for your number.",
#     "Your hostel room is too lit! You guys should host a party soon 😂",
#     "Make we dey together later for group work.",
#     "You know anywhere I fit print project fast for school?",
#     "I dey write test tomorrow abeg, come teach me small.",
#     "Please I lost my key. Can I chill in your room a bit?",
#     "Tell me where you stay. I wan drop something for you real quick.",
#     "Free ₦10,000 for Unilag students. Just send name and bank to promo-giveaway.org",
#     "Your roommate fine sha, she get boyfriend?",
#     "Guy abeg help me arrange my bed. I dey come now.",
#     "There’s a snake rumor in our block 😭 check under your bed oh!",
#     "Do you want to join a Unilag forex mentorship group? DM me fast!",
#     "Bro, I see free JAMB upgrade link oh. You wan try?",
#     "I dey room 108 for Eni Njoku. Come thru.",
#     "Did you collect your ID card yet? Mine never ready.",
#     "Anyone dey sell indomie? I wan cook now now.",
#     "Abeg pass me your stylus, I wan do digital drawing for assignment.",
#     "You go class today? Hope say lecturer no show.",
#     "I dey see you dey enter hostel every evening. You too fresh!",
#     "Please lend me your extension cord. My side no get socket.",
#     "Can I come to your room and charge my phone? Light don go my block.",
#     "Bro I fit come crash for your side for two nights?",
#     "Wetin you go cook today? I dey hungry small.",
#     "Someone go dey sweep your room tomorrow for hostel inspection.",
#     "Abeg who get spare key for Block D?",
#     "See babe I don text you two times. I no like to beg o.",
#     "That lecturer na scam. He dey collect 2k for attendance.",
#     "You still dey keep your bike for your room? Be careful oh.",
#     "Guy who dey sell black market fuel inside hostel?",
#     "Send me your number sharply. I dey outside already.",
#     "You wan collect DSTV decoder from that guy again?",
#     "I dey lonely. Come chill small for my room, abeg.",
#     "Abeg help me buy bread as you dey come back.",
#     "You get mosquito net I fit use?",
#     "Guy na you get that speaker wey dey shake whole floor?",
#     "No cap, I go like toast your friend. She single?",
#     "Slide me any update for student hustle wey sure pass.",
#     "I be year one student, abeg fit help me locate New Hall?",
#     "Make we just dey pray for hostel light oh. Generator don spoil.",
# ]

# general_chat_messages = [
#     "You go class today or you dey chill?",
#     "Abeg, you fit help me buy bread on your way back?",
#     "Come room 205, make we run assignment together.",
#     "Omo, no water again for bathroom. You don fetch?",
#     "You sabi cook jollof? Make we do cooking challenge later 😂",
#     "You get salt? I don start cooking already.",
#     "Who dey sell indomie downstairs? I wan buy two.",
#     "Bring your laptop, I wan copy that movie wey you talk about.",
#     "Guy, your speaker loud die yesterday! I no fit sleep 😭",
#     "Abeg, you fit borrow me your hotplate for 30 mins?",
#     "My gas don finish. Can I use your stove small?",
#     "I dey hungry, make we go buy shawarma for that guy near gate?",
#     "Abeg you fit charge my phone? My room no get light.",
#     "You dey room? I wan gist you something mad!",
#     "I go write test tomorrow. You fit tutor me quick?",
#     "Let’s go play ball this evening, I no touch field since Monday.",
#     "You fit escort me go pharmacy? I no feel too well.",
#     "Oya now, you dey go reading room this night?",
#     "Make we start project work today. Deadline dey near.",
#     "Who get scissors? I wan cut this thing small.",
#     "I dey fry eggs, you wan join chop?",
#     "Na you get that bucket with green cover? E still dey tap side.",
#     "You go class with me tomorrow? Or you dey ghost again?",
#     "Let’s binge Money Heist this weekend abeg.",
#     "Your roommate dey always blast music, you no dey vex?",
#     "You still get garri? I fit collect small?",
#     "E be like say NEPA wan give us light today oh!",
#     "Omo see babe for Jaja just now, I don fall 😭",
#     "You don hear say lecturer cancel test?",
#     "Your charger go fit work for my phone?",
#     "Come this side, gist full ground for you.",
#     "I dey come your block now now. Hope say you dey around.",
#     "You go help me submit assignment? I no go make am on time.",
#     "Borrow me your padlock abeg, mine don spoil.",
#     "We dey plan small hangout tonight, you go show?",
#     "Help me check if my clothes dry for line.",
#     "You get Dettol? I wan clean my injury.",
#     "This WiFi wey we dey pay for no dey even work again.",
#     "Make we link up for cafeteria by 1pm.",
#     "Abeg you see my towel anywhere? I think say I drop am for tap.",
#     "You wan do joint cooking today or na solo tin?",
#     "Your mattress too soft, I nearly oversleep 😂",
#     "You still get your test script? I wan cross-check answers.",
#     "Who get broom for this floor? Our own don spoil.",
#     "How far that guy wey dey fix phones? Him still dey hostel?",
#     "My guy, you sabi that girl wey dey wear pink today?",
#     "This new porters strict die. Person no fit breathe again.",
#     "I dey Fagunwa now, you dey come or make I bounce?",
#     "Come room 110, we dey watch match. Bring your vibes.",
#     "Your roommate get big flask? We need one for pap.",
# ]

# test_messages = [
#     "I dey Fagunwa now",
#     "you dey come or make I bounce?",
#     "Watsup",
#     "Please can youmake it 2500,im ready to pay",
#     "not at all, 3k last",
#     "please im really broke, help a broda",
#     "-Ogade find the rest, 5h nah smallz",
#     "please nah, oya 2.7k",
#     "just kuku do the 3k jeje",
#     "why you dey do like dis, u too like money, chop ur book",
#     "fashi",
#     "Good evening, how much last",
#     "how much you get?",
#     "1.5k",
#     "Soorry man, anoda tym",
#     "okay chill, i can pay 3k",
#     "-drop 3500 and its settled",
#     "jb by 3:30pm",
#     "sharp",
#     "dnt include details just use abbreviation",
#     "gst exam - entrance -bring it along",
# ]

# general_chat_messages = [
#     "left wing",
#     "top floor",
#     "left",
#     "wing",
#     "top",
#     "floor",
#     "fagunwa",
#     "honours",
#     "moremi",
#     "amina",
#     "kofo",
#     "jaja",
#     "mariere",
#     "eni njoku",
#     "eni jungle",
#     "biobaku",
#     "engineering",
#     "civil shed",
#     "where",
# ]

# messages = [
#     "Abeg, how much last you go collect for this laptop? I dey Unilag hostel.",
#     "Hello, I saw your listing for the HP laptop. Is the price negotiable?",
#     "Guy, make I give you 35k. The thing no be new na.",
#     "Can we meet on campus tomorrow to finalize this?",
#     "I no wan price am too low but 20k na wetin I get.",
#     "The phone still dey? I fit come see am for Yaba this evening?",
#     "Bro, this your shoe too mad. I go pay you 15k sharp if you deliver am today.",
#     "Omo, I dey find textbook for GST 102. You fit sell yours?",
#     "Can I pay half now and complete when we meet up?",
#     "You talk say the fridge dey work well, abi? I no wan carry wahala reach hostel.",
#     "Price too high abeg. Na Unilag we dey, things no easy like that.",
#     "This your bag fine wella. I go pay 3k. Final.",
#     "I'm a student, please can you reduce the price just a bit? Even 1,000 naira helps.",
#     "Wetin be your last price? I ready buy now now.",
#     "I'll take the microwave for ₦8,500 if you can drop it at New Hall.",
#     "Boss, na ₦2,500 I hold. You gree or make I waka?",
#     "If I buy two, you go reduce am for me?",
#     "I really like the bookshelf, but ₦18,000 is out of my budget. Can you do ₦12k?",
#     "No vex, I price am low but na all my allowance be that.",
#     "Can we talk on call? I fit explain why I dey beg for better price.",
#     "Na for school I dey use am o, abeg reason student life.",
#     "This printer wey you dey sell for 25k, I see the same one for 20k online. You fit beat that price?",
#     "Na your last price be this? Because e still high small for me.",
#     "I get 5k cash, and I fit pick am up now now if you agree.",
#     "Abeg, I dey look for used gas cooker, small one. If you sell for me 7k, we go run am.",
#     "You sure say this fan no dey make noise? I go collect am if e silent, but I fit do just ₦6,000.",
#     "If you no gree my price, no wahala, but I dey genuinely interested.",
#     "Thank you for getting back to me. If you can let it go for ₦10,000, it's a deal.",
#     "Guy, I sabi buy things. Just gimme better price, make we run am quick.",
#     "This one na final offer – ₦4,000, no more, no less. I dey broke die."
# ]

messages = [
"Ogade find the rest, 5h nah smallz",
"settled",
"drop 3500 and its settled",
"do 2k",
"I dey Fagunwa now, you dey come or make I bounce?",
"Your roommate get big flask? We need one for pap",
"fagunwa",
"mariere",
"jaja",
"biobaku",
"eni njoku",
"eni jungle",
"jungle",
"sodeinde",
"mth",
"moremi",
"honours",
"amina",
"makama",
"kofo",
"penthouse",
"ceg lab",
"lab",
"dubbing center",
"dubbing centre",
"love garden",
"lagoon",
"lagoon front",
"zenith bank",
"access bank",
"senate building",
"amphi theatre",
"amfi theatre",
"210402057",
"g_menna ig",
]


        #  <div class="notice">
        #     <p><strong>This Platform is ONLY TO NEGOTIATE PRICE</strong></p>
        #     <h2>⚠️ Important Notice on Sharing Personal Contact Information</h2>

        #     <p>
        #         To maintain a safe and trustworthy environment for all users, sharing personal contact information 
        #         (including phone numbers, addresses, emails, or social media handles) is <strong>strictly prohibited</strong> on this platform.
        #     </p>

        #     <p>Attempts to exchange contact details, whether directly or indirectly, may result in:</p>
        #     <ul>
        #         <li>🚫 Immediate account suspension or permanent blacklist</li>
        #         <li>⚖️ Possible legal action in accordance with our Terms of Service and privacy policies</li>
        #     </ul>

        #     <p>
        #         We actively monitor and enforce this policy using both automated systems and manual reviews.
        #     </p>

        #     <p>
        #         ✅ <strong>Please interact only through official in-app channels.</strong><br>
        #         🛡️ Your safety and privacy are our top priority.
        #     </p>

        #     <p>
        #         For more information, please refer to our 
        #         <a href="#" target="_blank">Community Guidelines</a> and 
        #         <a href="#" target="_blank">Terms of Use</a>.
        #     </p>
        #     </div>

        #     <style>
        #     .notice-container {
        #         background-color: #fff3cd;
        #         color: #856404;
        #         border: 1px solid #ffeeba;
        #         border-radius: 8px;
        #         padding: 20px;
        #         max-width: 700px;
        #         margin: 20px auto;
        #         font-family: 'Segoe UI', sans-serif;
        #         box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
        #         line-height: 1.6;
        #     }

        #     .notice-container h2 {
        #         font-size: 1.5em;
        #         margin-bottom: 10px;
        #     }

        #     .notice-container ul {
        #         margin-left: 20px;
        #     }

        #     .notice-container a {
        #         color: #0c5460;
        #         text-decoration: underline;
        #     }

        #     .notice-container a:hover {
        #         color: #004085;
        #     }
        #     </style>