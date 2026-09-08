SITE_UI = {
    "en": {
        "nav.home": "Home",
        "nav.calendar": "Events",
        "nav.about": "About Us",
        "nav.about_us": "About us",
        "nav.working_groups": "Working Groups",
        "nav.team_meetings": "Team Meetings",
        "nav.contacts": "Contact",
        "nav.join": "Join Us",
        "nav.forms": "Offers",
        "nav.forms_all": "All forms",
        "nav.language_tandem": "Language Tandem",
        "nav.suggest_event": "Suggest an Event",
        "nav.contact_questions": "Contact / Questions",
        "nav.admin": "Admin",
        "nav.karaoke": "Karaoke",
        "nav.team": "Team",
        "content.not_found_title": "Page not found",
        "content.not_found_body": "The page you are looking for does not exist.",
        "content.error_title": "Something went wrong",
        "content.error_body": "Please try again later.",
        "aria.main_nav": "Main navigation",
        "aria.language": "Language",
        "aria.appearance": "Toggle light or dark appearance",
        "aria.social": "Social media",
        "demo.banner_label": "Demo mode",
        "demo.banner_body": "synthetic data, no real backend. Actions are simulated.",
        "contact.title": "Contact",
        "contact.intro": "Send us a question or message. We usually reply by email.",
        "contact.channels_intro": "You can also reach us through:",
    },
    "de": {
        "nav.home": "Start",
        "nav.calendar": "Veranstaltungen",
        "nav.about": "Über uns",
        "nav.about_us": "Über uns",
        "nav.working_groups": "Arbeitsgruppen",
        "nav.team_meetings": "Teamtreffen",
        "nav.contacts": "Kontakt",
        "nav.join": "Mitmachen",
        "nav.forms": "Angebote",
        "nav.forms_all": "Alle Formulare",
        "nav.language_tandem": "Sprachtandem",
        "nav.suggest_event": "Event vorschlagen",
        "nav.contact_questions": "Kontakt / Fragen",
        "nav.admin": "Admin",
        "nav.karaoke": "Karaoke",
        "nav.team": "Team",
        "content.not_found_title": "Seite nicht gefunden",
        "content.not_found_body": "Die gesuchte Seite existiert nicht.",
        "content.error_title": "Etwas ist schiefgelaufen",
        "content.error_body": "Bitte versuche es später erneut.",
        "aria.main_nav": "Hauptnavigation",
        "aria.language": "Sprache",
        "aria.appearance": "Helles oder dunkles Design umschalten",
        "aria.social": "Soziale Medien",
        "demo.banner_label": "Demo-Modus",
        "demo.banner_body": "synthetische Daten, kein echtes Backend. Aktionen werden simuliert.",
        "contact.title": "Kontakt",
        "contact.intro": "Schick uns eine Frage oder Nachricht. Wir antworten normalerweise per E-Mail.",
        "contact.channels_intro": "Du erreichst uns auch über:",
    },
}

SITE_OFFERS = {
    "en": {
        "title": "Offers",
        "subtitle": "Information pages first, forms below.",
        "pages": [
            {
                "title": "Language Tandem",
                "url": "/offers/language-tandem",
                "icon": "chat",
                "description": "Practise one language with a partner while sharing a language you know well.",
                "featured": True,
                "secondary_action": {"title": "Apply for a tandem", "url": "/language-tandem"},
            },
            {
                "title": "International Tuesday",
                "url": "/offers/international-tuesday",
                "icon": "people",
                "event_kind": "international_tuesday",
                "description": "Meet students from around the world on selected Tuesday evenings at Humboldt-Haus.",
            },
            {
                "title": "Country Evening",
                "url": "/offers/country-evening",
                "icon": "globe",
                "event_kind": "country_evening",
                "description": "Discover a country through stories, food, music and conversation.",
                "secondary_action": {"title": "Suggest a Country Evening", "url": "/suggest-event?kind=country_evening"},
            },
            {
                "title": "Café Lingua",
                "url": "/offers/cafe-lingua",
                "icon": "chat",
                "event_kind": "cafe_lingua",
                "description": "Practice languages at relaxed conversation tables without prior registration.",
            },
            {
                "title": "International Breakfast",
                "url": "/offers/international-breakfast",
                "icon": "egg",
                "event_kind": "breakfast",
                "description": "Share a Saturday buffet inspired by a country or clearly defined culture.",
                "featured": True,
                "secondary_action": {"title": "Suggest a Breakfast", "url": "/suggest-event?kind=breakfast"},
            },
            {
                "title": "International Weekend",
                "url": "/offers/international-weekend",
                "icon": "signpost",
                "event_kind": "trip",
                "description": "Explore a nearby city or sight on a guided Saturday day trip.",
                "featured": True,
            },
            {
                "title": "INCAS Active",
                "url": "/offers/incas-active",
                "icon": "activity",
                "event_kind": "incas_active",
                "description": "Join social, outdoor and team activities in and around Aachen.",
            },
            {
                "title": "Board Game Nights",
                "url": "/offers/board-game-nights",
                "icon": "dice",
                "event_kind": "board_games",
                "description": "Bring a game or choose one from INCAS for an easy social evening.",
            },
            {
                "title": "Dance Workshops",
                "url": "/offers/dance-workshops",
                "icon": "music",
                "event_kind": "dance",
                "description": "Learn beginner-friendly dance steps and stay to practise together.",
            },
        ],
        "forms": [
            {
                "title": "Language Tandem",
                "url": "/language-tandem",
            },
            {
                "title": "Suggest an International Tuesday",
                "url": "/suggest-event?kind=country_evening",
            },
            {
                "title": "Suggest an International Breakfast",
                "url": "/suggest-event?kind=breakfast",
            },
            {
                "title": "Contact / Questions",
                "url": "/contact-form",
            },
        ],
    },
    "de": {
        "title": "Angebote",
        "subtitle": "Oben Infos, unten Formulare.",
        "pages": [
            {
                "title": "Sprachtandem",
                "url": "/offers/language-tandem",
                "icon": "chat",
                "description": "Übe eine Sprache mit einer passenden Person und teile eine Sprache, die du gut kannst.",
                "featured": True,
                "secondary_action": {"title": "Für ein Tandem anmelden", "url": "/language-tandem"},
            },
            {
                "title": "Internationaler Dienstag",
                "url": "/offers/international-tuesday",
                "icon": "people",
                "event_kind": "international_tuesday",
                "description": "Triff Studierende aus aller Welt an ausgewählten Dienstagabenden im Humboldt-Haus.",
            },
            {
                "title": "Länderabend",
                "url": "/offers/country-evening",
                "icon": "globe",
                "event_kind": "country_evening",
                "description": "Entdecke ein Land durch Geschichten, Essen, Musik und Gespräche.",
                "secondary_action": {"title": "Länderabend vorschlagen", "url": "/suggest-event?kind=country_evening"},
            },
            {
                "title": "Café Lingua",
                "url": "/offers/cafe-lingua",
                "icon": "chat",
                "event_kind": "cafe_lingua",
                "description": "Übe Sprachen an entspannten Gesprächstischen ohne vorherige Anmeldung.",
            },
            {
                "title": "Internationales Frühstück",
                "url": "/offers/international-breakfast",
                "icon": "egg",
                "event_kind": "breakfast",
                "description": "Teile ein Samstagsbuffet aus einem Land oder einer klar definierten Kultur.",
                "featured": True,
                "secondary_action": {"title": "Frühstück vorschlagen", "url": "/suggest-event?kind=breakfast"},
            },
            {
                "title": "Internationales Wochenende",
                "url": "/offers/international-weekend",
                "icon": "signpost",
                "event_kind": "trip",
                "description": "Erkunde bei einem Samstagsausflug eine Stadt oder Sehenswürdigkeit in der Region.",
                "featured": True,
            },
            {
                "title": "INCAS Aktiv",
                "url": "/offers/incas-active",
                "icon": "activity",
                "event_kind": "incas_active",
                "description": "Mach bei sozialen, sportlichen und Teamaktivitäten in und um Aachen mit.",
            },
            {
                "title": "Brettspielabende",
                "url": "/offers/board-game-nights",
                "icon": "dice",
                "event_kind": "board_games",
                "description": "Bring ein Spiel mit oder wähle eines von INCAS für einen lockeren Abend.",
            },
            {
                "title": "Tanzworkshops",
                "url": "/offers/dance-workshops",
                "icon": "music",
                "event_kind": "dance",
                "description": "Lerne anfängerfreundliche Tanzschritte und übe anschließend gemeinsam weiter.",
            },
        ],
        "forms": [
            {
                "title": "Sprachtandem",
                "url": "/language-tandem",
            },
            {
                "title": "Internationalen Dienstag vorschlagen",
                "url": "/suggest-event?kind=country_evening",
            },
            {
                "title": "Internationales Frühstück vorschlagen",
                "url": "/suggest-event?kind=breakfast",
            },
            {
                "title": "Kontakt / Fragen",
                "url": "/contact-form",
            },
        ],
    },
}


def get_site_offers(locale):
    return SITE_OFFERS.get(locale) or SITE_OFFERS["en"]


def get_footer_offer_links(locale):
    locale = locale if locale in SITE_PAGES else "en"
    page_map = SITE_PAGES.get(locale) or SITE_PAGES["en"]
    footer_keys = ("international_tuesday", "international_breakfast", "language_tandem")
    return [
        {
            "title": page_map[key]["title"],
            "url": f"/offers/{key.replace('_', '-')}" if key != "language_tandem" else "/offers/language-tandem",
        }
        for key in footer_keys
    ]

def get_footer_legal_links(locale):
    locale = locale if locale in SITE_PAGES else "en"
    page_map = SITE_PAGES.get(locale) or SITE_PAGES["en"]
    return [
        {"title": page_map["impressum"]["title"], "url": "/impressum"},
        {"title": page_map["privacy"]["title"], "url": "/privacy"},
    ]


def t(locale, key):
    return SITE_UI.get(locale, {}).get(key) or SITE_UI["en"].get(key) or key

SITE_PAGES = {
    "en": {
        "about": {
            "title": "About us",
            "image": "img/site/about-team.webp",
            "body_html": """
<section class="vstack gap-3">
    <p class="lead text-body-emphasis mb-0">
        INCAS stands for
        <span class="fw-bold text-primary">IN</span>tercultural
        <span class="fw-bold text-primary">C</span>entre of
        <span class="fw-bold text-primary">A</span>achen
        <span class="fw-bold text-primary">S</span>tudents. We are a student organisation, which is financially and logistically supported by the International Office of RWTH Aachen and FH Aachen. INCAS mainly serves international students studying at universities, doing an internship or taking a German class in Aachen.
    </p>
    <p class="text-body-secondary mb-0">
        The INCAS international team consists of foreign and German students. Our goal is to develop a cultural bridge between students from all countries by promoting their integration and the intercultural communication among them. We support foreign students to make their stay in Aachen as pleasant as possible by providing the help and information they require.
    </p>
</section>
""".strip(),
        },
        "working_groups": {
            "title": "Working Groups",
            "image": None,
            "body_html": """
<section class="vstack gap-4">
    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <p class="lead mb-2">
            The tasks in INCAS are organized in different work groups. Each group has at least one leader, who is responsible for the activities of the group.
        </p>
        <p class="mb-0 text-body-secondary">
            The work groups evaluate their progress and plan and discuss future projects mostly independently. This is where you can contribute with your personal ideas and experiences just according to the amount of time you are ready to invest.
        </p>
    </div>

    <p class="mb-0">Our team consists of the following work groups:</p>

    <div class="list-group list-group-flush border rounded-2 overflow-hidden">
        <section class="list-group-item py-3">
            <h2 class="h5 mb-2 text-primary-emphasis">Coordination</h2>
            <p class="mb-0">Two students of our team are responsible for the leadership of INCAS. They overview all activities, lead the weekly team meeting and they are the contact person for the group leaders. Furthermore, they represent INCAS outwards.</p>
        </section>
        <section class="list-group-item py-3">
            <h2 class="h5 mb-2 text-primary-emphasis">International Tuesday and Café Lingua</h2>
            <p class="mb-0">This work group organizes selected Tuesday evening events, including country evenings, Café Lingua, quizzes, music and barbecues. Current dates and formats are published in the event calendar. Café Lingua offers several language tables where people can meet and practise together.</p>
        </section>
        <section class="list-group-item py-3">
            <h2 class="h5 mb-2 text-primary-emphasis">International Weekend</h2>
            <p class="mb-0">Once a month we organize a day trip to a destination in Germany or to the neighboring countries. The work group "International Weekend" is responsible for finding ideas, planning, organizing and accompanying the participants during the day of the trip. An extensive preparation and follow-up of each excursion needs to be provided by the team, i.e. the organization of the program for the whole day, the advertisement, the registration process, the financial calculation and later the evaluation of the trip. International guests, interesting cities and a varying program make every excursion a special experience.</p>
        </section>
        <section class="list-group-item py-3">
            <h2 class="h5 mb-2 text-primary-emphasis">Accommodation Search and Service Hours</h2>
            <p class="mb-0">Searching for an accommodation in a new city and being confronted with the problem not to master the language is a big challenge for every international student. The work group Apartment Search is always on hand with help and advice. On the other hand, "Service Hours" are offered several times a week. During these hours feel free to come to our office in Humboldt-Haus and tell us your questions concerning hiring contracts, university issues, or other student problems. Our "Service Hours" take place in several languages.</p>
        </section>
        <section class="list-group-item py-3">
            <h2 class="h5 mb-2 text-primary-emphasis">Language Exchange</h2>
            <p class="mb-0">You might know this problem: You are visiting one language course after the other, but you are not able to hold talks yet. As a result, INCAS team decided to establish a database, where we collect information about the people who are interested in doing a tandem and we bring them together. The work group "Language exchange" is also open to give you hints how to organise a tandem effectively and at the same time with a lot of fun. Afterwards, it is your turn: You meet your tandem partner wherever you want and how often you want. With a little luck you will find a new friend, improve your target language and learn more about the cultural background of your tandem partner.</p>
        </section>
        <section class="list-group-item py-3">
            <h2 class="h5 mb-2 text-primary-emphasis">International Breakfast</h2>
            <p class="mb-0">The International Breakfast work group prepares our monthly Saturday breakfast at Humboldt-Haus and organizes its registration. The exact date, represented country or culture, deposit and availability are published with each event.</p>
        </section>
        <section class="list-group-item py-3">
            <h2 class="h5 mb-2 text-primary-emphasis">Public Relations</h2>
            <p class="mb-0">To keep you up to date about the events INCAS is organizing for you and to get in touch with new students there is one responsible for public relations. The work includes the maintenance of the website, facebook page, designing flyers and all other that is related to the public appearance of INCAS.</p>
        </section>
        <section class="list-group-item py-3">
            <h2 class="h5 mb-2 text-primary-emphasis">INCAS Active</h2>
            <p class="mb-0">Beside our regular program, we always try to offer some special activities for our guests. Therefore, we go together to the climbing forest, do ice-skating or play soccer together. INCAS Active cares about the ideas, organization and enrollment of the activities. Here you are always free to tell us your ideas and suggestions for the next event and organize it with us.</p>
        </section>
    </div>
</section>
""".strip(),
        },
        "team_meetings": {
            "title": "Team Meetings",
            "image": "img/site/team-meetings.webp",
            "body_html": """
<section class="vstack gap-4">
    <p class="lead mb-0">
        We meet once a week with the active team members from INCAS in order to exchange relevant information and determine the progress of all work groups. If you are interested in joining our team, just come to one of our regular meetings where you can find out more about who we are and what exactly we are doing.
    </p>
    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <p class="mb-0">
            The weekly meeting of the INCAS team takes place every <strong class="text-primary-emphasis">Tuesday at 7:00 p.m.</strong> in the <strong>INCAS office at Humboldt-Haus</strong> and is open to everyone. If you have any questions about the team meeting do not hesitate to contact us.
        </p>
    </div>
</section>
""".strip(),
        },
        "board_game_nights": {
            "title": "Board Game Nights",
            "image": None,
            "body_html": """
<section class="vstack gap-4">
    <div>
        <h2 class="h3 text-body-emphasis">Play together at Humboldt-Haus</h2>
        <p class="lead mb-0">On selected International Tuesdays, INCAS hosts board game nights for students who want to meet people in a relaxed, low-pressure setting.</p>
    </div>

    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <h3 class="h5 mb-2">What to expect</h3>
        <p class="mb-2">You can choose one of the games available at INCAS or bring your own game for the evening.</p>
        <p class="mb-0">The focus is on easy conversation, playing together and meeting new people. You do not need to arrive with a group.</p>
    </div>

    <section>
        <h2 class="h4 text-primary-emphasis">When does it happen?</h2>
        <p class="mb-0">Board Game Nights are not a fixed weekly offer. They are announced as part of the public programme in the <a class="link-primary" href="/events">event calendar</a> and on our social media channels.</p>
    </section>
</section>
""".strip(),
        },
        "dance_workshops": {
            "title": "Dance Workshops",
            "image": None,
            "body_html": """
<section class="vstack gap-4">
    <div>
        <h2 class="h3 text-body-emphasis">Beginner-friendly dance evenings</h2>
        <p class="lead mb-0">Usually once a semester, INCAS collaborates with Sol de la Salsa to offer beginner dance workshops for students.</p>
    </div>

    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <h3 class="h5 mb-2">How the evening works</h3>
        <p class="mb-2">Prior knowledge is not required. The evening starts with a guided course and continues with time to practice the new steps.</p>
        <p class="mb-0">The workshops are designed as social events, so you can come along even if you have not danced before.</p>
    </div>

    <section>
        <h2 class="h4 text-primary-emphasis">Current dates</h2>
        <p class="mb-0">Dance Workshop dates are announced in the <a class="link-primary" href="/events">event calendar</a> when the next collaboration is planned.</p>
    </section>
</section>
""".strip(),
        },
        "international_breakfast": {
            "title": "International Breakfast",
            "image": "img/site/international-breakfast.webp",
            "form": {
                "type": "suggest_event",
                "preset": {
                    "kind": "breakfast",
                },
            },
            "body_html": """
<section class="vstack gap-3">
    <p class="lead mb-0">
        Our <strong>International Breakfast</strong> is a monthly buffet which lets you have a relaxed and fun start into the day while meeting new people from all over the world. It usually takes place on a Saturday.
    </p>
    <p class="mb-0">
        Depending on the event we may serve dishes from foreign countries, or sometimes even Germany. Past events from this year include Turkish and Peruvian breakfasts.
    </p>
    <p class="mb-0">
        For exact dates, registration and more detailed information you can check out the website, <a class="link-primary" title="Facebook Website INCAS Aachen" href="https://www.facebook.com/INCASAachen/" target="_blank" rel="noopener">Facebook</a>, <a class="link-primary" title="INCAS Instagram Page" href="https://www.instagram.com/incas_aachen/" target="_blank" rel="noopener">Instagram</a> or ask us on the International Tuesday events.
    </p>
    <p class="mb-0 fw-semibold text-body-emphasis">We're looking forward to seeing you.</p>
</section>
""".strip(),
        },
        "international_weekend": {
            "title": "International Weekend",
            "image": "img/site/international-weekend.webp",
            "body_html": """
<section class="vstack gap-4">
    <div>
        <h2 class="h3 text-body-emphasis">Explore beyond Aachen</h2>
        <p class="lead mb-3">You are new in Aachen, want to explore the surroundings, make new friends and learn more about German culture and history?</p>
        <p class="mb-0">Then you should join us on an <strong>INCAS Weekend</strong>. Once a month, INCAS offers a day trip to a city or sight in Germany, Belgium, the Netherlands, France or Luxembourg.</p>
    </div>

    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <h3 class="h5 mb-2">What to expect</h3>
        <p class="mb-2">Our trips usually include a guided city tour, a museum visit or another local sight. Past destinations include Luxembourg, the underground caves in Maastricht and the Drachenfels near Bonn.</p>
        <p class="mb-0">Every month brings a different destination.</p>
    </div>

    <section>
        <h2 class="h4 text-primary-emphasis">Registration and cost</h2>
        <p class="mb-0">Each trip is announced in advance on our website and social media channels. The current ticket price, capacity and registration details are listed with the event announcement.</p>
    </section>

    <section>
        <h2 class="h4 text-body-emphasis">FAQ</h2>
        <div class="accordion" id="international-weekend-faq-en">
            <div class="accordion-item">
                <h3 class="accordion-header">
                    <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#international-weekend-faq-en-1" aria-expanded="true" aria-controls="international-weekend-faq-en-1">When are the trips?</button>
                </h3>
                <div id="international-weekend-faq-en-1" class="accordion-collapse collapse show" data-bs-parent="#international-weekend-faq-en">
                    <div class="accordion-body">The trips are on a Saturday, once a month. The specific date is announced about two to three weeks before the trip.</div>
                </div>
            </div>
            <div class="accordion-item">
                <h3 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#international-weekend-faq-en-2" aria-expanded="false" aria-controls="international-weekend-faq-en-2">How can I register?</button>
                </h3>
                <div id="international-weekend-faq-en-2" class="accordion-collapse collapse" data-bs-parent="#international-weekend-faq-en">
                    <div class="accordion-body">Register through the contact or registration link provided in the event description.</div>
                </div>
            </div>
            <div class="accordion-item">
                <h3 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#international-weekend-faq-en-3" aria-expanded="false" aria-controls="international-weekend-faq-en-3">Can I register friends?</button>
                </h3>
                <div id="international-weekend-faq-en-3" class="accordion-collapse collapse" data-bs-parent="#international-weekend-faq-en">
                    <div class="accordion-body">You can register only one person, either yourself or one friend. Groups cannot be registered by one person; everyone needs to register individually.</div>
                </div>
            </div>
            <div class="accordion-item">
                <h3 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#international-weekend-faq-en-4" aria-expanded="false" aria-controls="international-weekend-faq-en-4">Which language are the guided tours in?</button>
                </h3>
                <div id="international-weekend-faq-en-4" class="accordion-collapse collapse" data-bs-parent="#international-weekend-faq-en">
                    <div class="accordion-body">Guided tours are usually in English. Museums may offer audio guides in German, Spanish, French or other languages, but we cannot guarantee availability.</div>
                </div>
            </div>
            <div class="accordion-item">
                <h3 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#international-weekend-faq-en-5" aria-expanded="false" aria-controls="international-weekend-faq-en-5">Who can participate?</button>
                </h3>
                <div id="international-weekend-faq-en-5" class="accordion-collapse collapse" data-bs-parent="#international-weekend-faq-en">
                    <div class="accordion-body">Students of RWTH Aachen and FH Aachen, German-course students at the Sprachenakademie, and PhD students can participate.</div>
                </div>
            </div>
            <div class="accordion-item">
                <h3 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#international-weekend-faq-en-6" aria-expanded="false" aria-controls="international-weekend-faq-en-6">Do you offer multi-day tours?</button>
                </h3>
                <div id="international-weekend-faq-en-6" class="accordion-collapse collapse" data-bs-parent="#international-weekend-faq-en">
                    <div class="accordion-body">We usually offer day trips only. If an exceptional multi-day tour is planned, we will announce it as early as possible.</div>
                </div>
            </div>
        </div>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Questions?</h2>
        <p class="mb-0">Contact us through our <a class="link-primary" href="/contacts">contacts page</a>. We are looking forward to seeing you soon.</p>
    </section>
</section>
""".strip(),
        },
        "cafe_lingua": {
            "title": "Café Lingua",
            "image": "img/site/cafe-lingua.webp",
            "body_html": """
<section class="vstack gap-4">
    <div>
        <h2 class="h3 text-body-emphasis">Practice languages together</h2>
        <p class="lead mb-3">Foreign languages are best learned by practicing, having intercultural conversations and having fun.</p>
        <p class="mb-0">Our <strong>Café Lingua</strong> gives you a relaxed place to do exactly that.</p>
    </div>

    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <h3 class="h5 mb-2">How it works</h3>
        <p class="mb-0">Café Lingua takes place on selected Tuesday evenings announced in the event calendar. You can meet students with different native languages, join language tables, ask questions and practise in a friendly setting.</p>
    </div>

    <section>
        <h2 class="h4 text-primary-emphasis">Language Tandem and Café Lingua</h2>
        <p class="mb-0">You do not need to be registered for our <a class="link-primary" href="/offers/language-tandem">Language Tandem</a> to join. The more you practice, the better. If you are looking for someone to practice with individually, you may even find a tandem partner here.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Current dates</h2>
        <p class="mb-0">Current events can always be found in our <a class="link-primary" href="/events">event calendar</a>. Have a seat: it is time for Café Lingua.</p>
    </section>
</section>
""".strip(),
        },
        "incas_active": {
            "title": "INCAS Active",
            "image": "img/site/incas-active.webp",
            "body_html": """
<section class="vstack gap-4">
    <div>
        <h2 class="h3 text-body-emphasis">Activities with the INCAS team</h2>
        <p class="lead mb-3">Apart from the many activities we offer for students in Aachen, we also organize activities for our team.</p>
        <p class="mb-0">These range from team-building events to simply having a good time together. They help us get to know each other better and continue developing as a team.</p>
    </div>

    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <h3 class="h5 mb-2">Examples</h3>
        <p class="mb-0">Hiking trips, festivals, barbecues, ice cream in the park, escape rooms and similar activities are all possible. Team members can suggest new ideas through an online form.</p>
    </div>

    <section>
        <h2 class="h4 text-primary-emphasis">Join the team</h2>
        <p class="mb-0">If you want to take part in these activities too, join our team. We are looking forward to meeting you and welcoming new members.</p>
    </section>
</section>
""".strip(),
        },
        "country_evening": {
            "title": "Country Evening",
            "image": "img/site/country-evening.webp",
            "body_html": """
<section class="vstack gap-4">
    <div>
        <h2 class="h3 text-body-emphasis">Showcase a country</h2>
        <p class="lead mb-3">Every month, one International Tuesday is dedicated to the presentation of a country.</p>
        <p class="mb-0">Students share authentic impressions from their home country: facts, photos, typical food to taste, music, dances and sometimes traditional clothing.</p>
    </div>

    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <h3 class="h5 mb-2">After the presentation</h3>
        <p class="mb-0">There is time to ask questions, talk about the evening and meet people in a relaxed atmosphere.</p>
    </div>

    <section>
        <h2 class="h4 text-primary-emphasis">Showcase your homeland</h2>
        <p>You are very welcome to give a presentation about your country. You can choose the topics: culture, geography, economy, national sports, an interesting movie, a dance or a mix of everything.</p>
        <p>We can support you during preparation if you need help. The presentation language should be English or German.</p>
        <p class="mb-0">Share impressions from your country with the international community in Aachen.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Get in touch</h2>
        <p class="mb-0">If you would like to present your country, <a class="link-primary" href="/suggest-event?kind=country_evening">suggest a Country Evening</a> or <a class="link-primary" href="/contact-form">contact us</a>.</p>
    </section>
</section>
""".strip(),
        },
        "international_tuesday": {
            "title": "International Tuesday",
            "image": "img/site/international-tuesday.webp",
            "form": {
                "type": "suggest_event",
                "preset": {
                    "kind": "country_evening",
                },
            },
            "body_html": """
<section class="vstack gap-4">
    <div>
        <h2 class="h3 text-body-emphasis">The world is waiting for you!</h2>
        <p class="lead mb-3">The "Internationaler Dienstag" department is the main crew behind the events that take place on Tuesdays at Humboldt-Haus.</p>
        <p class="mb-0">International Tuesday brings students from many countries together for selected Tuesday evening events. The programme changes between cultural presentations, games, music and other social formats.</p>
    </div>

    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <h3 class="h5 mb-2">When and where does it take place?</h3>
        <p class="mb-1"><strong class="text-primary-emphasis">Tuesday evenings, usually starting at 8 pm</strong></p>
        <p class="mb-0">Check the event calendar for the next confirmed date and format.</p>
        <p class="mb-0">Humboldt-Haus, Pontstraße 41</p>
    </div>

    <div>
        <h2 class="h4 text-body-emphasis">Regular Program</h2>
        <p>Related to the International Tuesday, we offer you a special program:</p>
        <ul class="list-group list-group-flush border rounded-2 overflow-hidden">
            <li class="list-group-item">Country Evening</li>
            <li class="list-group-item"><a class="link-primary" href="/offers/cafe-lingua">Café Lingua</a></li>
            <li class="list-group-item">Barbecues in summer</li>
            <li class="list-group-item">Music nights</li>
            <li class="list-group-item">Easter celebrations</li>
            <li class="list-group-item">Christmas celebrations</li>
            <li class="list-group-item">Pub Quiz</li>
            <li class="list-group-item">And more</li>
        </ul>
    </div>

    <p class="mb-0">You can receive the current information about upcoming events by checking our <a class="link-primary" href="/events">event calendar</a>. The INCAS team and Aachen's international community cannot wait to meet you.</p>

    <hr class="my-2">

    <section>
        <h2 class="h4 text-primary-emphasis">Country Nights</h2>
        <p>You are very welcome to give a presentation about your country. You can choose the topics you want to talk about, no matter whether it is cultural information, geographical aspects, the economy, your national sport, an interesting movie, a dance or some of each. Of course we will also support you during the preparation in case you need any help from us. The language used should be either English or German. Share with us impressions from your country!</p>
    </section>
    <section>
        <h2 class="h4 text-primary-emphasis">Barbecue</h2>
        <p>In summer, when the weather is good, we sometimes organize barbecues. The confirmed date and what to bring are published with the event.</p>
    </section>
    <section>
        <h2 class="h4 text-primary-emphasis">Music Night</h2>
        <p>Can you sing or play an instrument? Do you play in a band? We are excited to hear your voice and your music.</p>
    </section>
    <section>
        <h2 class="h4 text-primary-emphasis">Special Celebrations</h2>
        <p>How do people celebrate Easter and Christmas in Germany? Join us in our events to celebrate together so that you learn about special German or local traditions. We will paint easter eggs, cook traditional German food together, bake cake, or sing typical Christmas songs. And much more. Just come and let us surprise you!</p>
    </section>
    <section>
        <h2 class="h4 text-primary-emphasis">You have your own idea?</h2>
        <p>Do you have further ideas or questions regarding our "International Tuesday"? Just <a class="link-primary" href="/contact-form">contact us</a>.</p>
        <p class="mb-0">We are looking forward to hearing from you,<br>your INCAS Team</p>
    </section>
</section>
""".strip(),
        },
        "language_tandem": {
            "title": "Language Tandem",
            "image": "img/site/language-tandem.webp",
            "form": {
                "type": "language_tandem",
            },
            "body_html": """
<section class="vstack gap-4">
    <div>
        <h2 class="h3 text-body-emphasis">In a language tandem or Sprachtandem partnership</h2>
        <p class="lead mb-3">Learning a language just from books is not only boring, but it will never achieve the desired result. What really helps is active talking.</p>
        <p class="mb-0">If you are looking for a suitable tandem partner to have actual conversations in a certain language, we can help you to find someone. That way you can practice together and learn from each other while having much more fun.</p>
    </div>

    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <p class="mb-2">To <strong>register for the Sprachtandem</strong>, fill in the form on this page.</p>
        <a class="btn btn-primary" href="#page-form">Go to Sprachtandem form</a>
    </div>

    <p class="mb-0">More than <strong class="text-primary-emphasis">300</strong> participants are matched each year.</p>

    <section>
        <h2 class="h4 text-primary-emphasis">Or speak with many people</h2>
        <p>The Café Lingua is an international, multilingual café, where you can sit together, have a coffee, tea or beer while practicing the languages you like. Here people interested in languages come together.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Other possibilities</h2>
        <p>Especially for those among you interested in the French culture and language the French-German Cultural Institute offers a variety of classes and other programmes in French and German. You can find the homepage with <a class="link-primary" title="Institut Francais Homepage" href="https://www.institutfrancais.de/de/aachen" target="_blank" rel="noopener">this link</a>.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">What exactly is a Sprachtandem?</h2>
        <p>The idea is to bring two persons with different native languages together so that they can learn from each other.</p>
        <p>It entirely depends on you how you plan your meetings. You can either do some grammar or you can simply have interesting discussions with your partner about films, books or your activities during the last weekend. At the same time you will be able to extend your cultural horizon and to get in touch with nice people.</p>
        <p class="mb-0">Here you can apply your knowledge acquired in classroom lessons in real life.</p>
    </section>

    <section>
        <h2 class="h4 text-body-emphasis">How does this whole thing actually work?</h2>
        <ol class="list-group list-group-numbered">
            <li class="list-group-item">
                <div class="fw-semibold text-body-emphasis">Registration</div>
                <p class="mb-0">If you are looking for a language exchange partner, you will first of all have to fill in the <a class="link-primary" href="#page-form">Sprachtandem form</a>. Please take care to only check those languages you feel confident teaching, respectively those you want to learn. You can mention your other languages in the comments section. This allows us to assign you the right tandem.</p>
            </li>
            <li class="list-group-item">
                <div class="fw-semibold text-body-emphasis">How INCAS finds a language exchange partner for you</div>
                <p class="mb-0">As soon as we find a partner for you, we will send you his/her information. It will be up to you to get in touch with each other.</p>
            </li>
            <li class="list-group-item">
                <div class="fw-semibold text-body-emphasis">As soon as you have found a partner</div>
                <p class="mb-0">It is entirely up to you on how you do your language exchange. It might be helpful if you choose an activity that provides you with enough topics to talk about: cooking typical dishes, going out or also just plain grammar studies.</p>
            </li>
        </ol>
    </section>

    <section>
        <h2 class="h4 text-body-emphasis">Any Questions?</h2>
        <div class="accordion" id="language-tandem-faq-en">
            <div class="accordion-item">
                <h3 class="accordion-header">
                    <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#language-tandem-faq-en-1" aria-expanded="true" aria-controls="language-tandem-faq-en-1">What do you do if the language exchange does not really work?</button>
                </h3>
                <div id="language-tandem-faq-en-1" class="accordion-collapse collapse show" data-bs-parent="#language-tandem-faq-en">
                    <div class="accordion-body">In this case, please contact us and we will help you to find a new partner.</div>
                </div>
            </div>
            <div class="accordion-item">
                <h3 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#language-tandem-faq-en-2" aria-expanded="false" aria-controls="language-tandem-faq-en-2">You might think that your language knowledge does not suffice?</button>
                </h3>
                <div id="language-tandem-faq-en-2" class="accordion-collapse collapse" data-bs-parent="#language-tandem-faq-en">
                    <div class="accordion-body">Don't worry, you can still apply and get a partner even though your level of proficiency is not that high. If you are interested in meeting someone from a different country who speaks a different language, e.g. Chinese, then you have the possibility simply get in touch through more of a cultural exchange.</div>
                </div>
            </div>
            <div class="accordion-item">
                <h3 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#language-tandem-faq-en-3" aria-expanded="false" aria-controls="language-tandem-faq-en-3">You would like to share your Sprachtandem experience?</button>
                </h3>
                <div id="language-tandem-faq-en-3" class="accordion-collapse collapse" data-bs-parent="#language-tandem-faq-en">
                    <div class="accordion-body">Send us an email. We will publish the most interesting reports in order to give a better overview of the possible varieties of the programme and to encourage more people to start a tandem.</div>
                </div>
            </div>
        </div>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Contact</h2>
        <p>If you have any further questions regarding our language offers just send us an email through our <a class="link-primary" href="/contact-form">contact form</a>.</p>
        <p class="mb-0">We are looking forward to hearing from you,<br>your INCAS Team</p>
    </section>
</section>
""".strip(),
        },
        "impressum": {
            "title": "Impressum",
            "image": None,
            "body_html": """
<section class="vstack gap-4">
    <p class="text-body-secondary mb-0">Information pursuant to Section 5 of the German Digital Services Act (DDG).</p>

    <section>
        <h2 class="h4 text-primary-emphasis">Provider</h2>
        <p class="mb-0">
            Interkulturelles Centrum Aachener Studierender e.V.<br>
            Pontstraße 41<br>
            52062 Aachen<br>
            Germany
        </p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Register entry</h2>
        <p class="mb-0">Register of associations: VR 5770<br>Registering court: Amtsgericht Aachen</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Represented by</h2>
        <p class="mb-0">1st Coordinator: Nölke, Linus Ary<br>2nd Coordinator: Rzaev, Vladmir</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Contact</h2>
        <p class="mb-0">Phone: +49 241 80 98184<br>Written contact: <a class="link-primary" href="/contact-form">contact form</a></p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Consumer dispute resolution</h2>
        <p class="mb-0">We are neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Liability for content and links</h2>
        <p>As a service provider we are responsible for our own content on these pages under general law. We are not obliged to monitor transmitted or stored third-party information or to investigate circumstances that indicate unlawful activity.</p>
        <p class="mb-0">Our site links to external websites over whose content we have no influence. The respective provider is always responsible for the content of linked pages. Those pages were checked for legal violations at the time of linking; unlawful content was not recognisable.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Privacy</h2>
        <p class="mb-0">How we handle personal data is described in our <a class="link-primary" href="/privacy">privacy policy</a>.</p>
    </section>
</section>
""".strip(),
        },
        "privacy": {
            "title": "Privacy Policy",
            "image": None,
            "body_html": """
<section class="vstack gap-4">
    <p class="text-body-secondary mb-0">This notice explains what personal data we process when you use this website, on what legal basis, and which rights you have (Art. 13 GDPR). Last updated: September 2026.</p>

    <section>
        <h2 class="h4 text-primary-emphasis">1. Controller</h2>
        <p class="mb-0">
            Interkulturelles Centrum Aachener Studierender e.V.<br>
            Pontstraße 41, 52062 Aachen, Germany<br>
            Phone: +49 241 80 98184 · <a class="link-primary" href="/contact-form">contact form</a>
        </p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">2. Your rights</h2>
        <p>You have the right to access your data (Art. 15), to rectification (Art. 16), to erasure (Art. 17), to restriction of processing (Art. 18), to data portability (Art. 20) and to object to processing based on our legitimate interests (Art. 21). Where processing is based on consent, you may withdraw it at any time with effect for the future (Art. 7(3)).</p>
        <p class="mb-0">You also have the right to lodge a complaint with a data protection supervisory authority. The authority responsible for us is the Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">3. Legal bases</h2>
        <p class="mb-0">Depending on the purpose we rely on your consent (Art. 6(1)(a), and Art. 9(2)(a) for special categories of data), the performance of a contract or steps taken at your request before entering into one (Art. 6(1)(b)), a legal obligation (Art. 6(1)(c)), or our legitimate interest in running the association's activities securely and efficiently (Art. 6(1)(f)).</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">4. Hosting and server log files</h2>
        <p>This website runs on hosted server infrastructure. When you open a page, the hosting environment automatically writes technical data to server log files: browser type and version, operating system, referrer URL, host name, the requesting IP address and the time of the request. This data is processed on the basis of Art. 6(1)(f) GDPR for the secure and stable operation of the site and is not merged with other data sources.</p>
        <p class="mb-0">If we use a hosting provider that processes personal data on our behalf, we conclude a data processing agreement with that provider pursuant to Art. 28 GDPR.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">5. Data you submit through forms</h2>
        <p>We only ask for what we need to handle your request. Free-text fields are optional; please do not enter special categories of data (for example health, religion or political views) unless it is necessary for your request. If you do, we process it on the basis of your consent under Art. 9(2)(a) GDPR, which you give by submitting the form.</p>
        <div class="list-group list-group-flush border rounded-2 overflow-hidden">
            <section class="list-group-item py-3">
                <h3 class="h6 mb-1">Contact form</h3>
                <p class="mb-0">Name, email address, optional subject, message. Purpose: answering your enquiry. Legal basis: Art. 6(1)(b) where it concerns taking part in our activities, otherwise Art. 6(1)(f).</p>
            </section>
            <section class="list-group-item py-3">
                <h3 class="h6 mb-1">Event suggestion</h3>
                <p class="mb-0">Contact name, email address and/or phone number, the country or culture you suggest, optional comment. Purpose: reviewing and following up on your suggestion. Legal basis: Art. 6(1)(f).</p>
            </section>
            <section class="list-group-item py-3">
                <h3 class="h6 mb-1">Language Tandem registration</h3>
                <p class="mb-0">First and last name, email address, occupation, gender, year of birth, planned departure date, country of origin, the languages you offer and request with your self-assessed level, partner preferences and an optional comment. Purpose: finding and proposing a tandem partner and contacting you about it. Legal basis: Art. 6(1)(b) for the matching service you request; for any special categories you volunteer in the comment: Art. 9(2)(a).</p>
            </section>
            <section class="list-group-item py-3">
                <h3 class="h6 mb-1">Event registration</h3>
                <p class="mb-0">First and last name, email address, occupation, an optional comment and, for breakfast events, your meal preference. Purpose: managing your place, the waiting list and, where a deposit or ticket applies, the payment. Legal basis: Art. 6(1)(b); the meal preference is processed on the basis of consent (Art. 6(1)(a), and Art. 9(2)(a) where it reveals religious or health information), which you give by selecting it.</p>
            </section>
            <section class="list-group-item py-3">
                <h3 class="h6 mb-1">Karaoke queue</h3>
                <p class="mb-0">Display name, song and artist, an optional note and an optional contact detail. Purpose: running the karaoke queue during an event. Legal basis: Art. 6(1)(a) / Art. 6(1)(f).</p>
            </section>
        </div>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">6. Recipients</h2>
        <p>Your data is accessible to the INCAS volunteers who organise the relevant activity. For Language Tandem, matching is done through a pseudonymised admin view; names and contact details are shown only to the volunteers who carry out the actual introduction.</p>
        <p class="mb-0">We pass data to third parties only where necessary: a hosting provider (see section 4), the operator of the mail server we use to send you transactional emails such as a registration link, and — for events with a deposit or ticket — a payment service provider. Payment and social-media publishing currently run in a simulated mode in which no real payment data is transmitted; this notice will be updated before a live provider is used.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">7. Retention</h2>
        <p class="mb-0">We keep personal data only as long as it is needed for the purpose it was collected for or to meet a legal retention obligation, and delete it afterwards. You can ask us to delete your data at any time using the contact details above; we will do so unless a legal obligation requires us to keep it.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">8. Data security</h2>
        <p class="mb-0">The site is served over HTTPS (TLS). Admin access is protected by expiring access keys and is split into separate capabilities, so a volunteer only sees the data their task requires; the Language Tandem matching view is pseudonymised by design (Art. 25, Art. 32 GDPR).</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">9. Cookies and local storage</h2>
        <p>We use no tracking or advertising cookies and show no consent banner. We set two cookies, both strictly necessary and exempt from consent under Section 25(2) TDDDG: a <code>locale</code> cookie that remembers your language choice, and a session cookie that is created only after an admin signs in and keeps that session.</p>
        <p class="mb-0">Your browser's local storage keeps a few settings on your device only: your light/dark preference, your language choice, and — if you join a karaoke queue — a random identifier so you can manage your own entry. This information stays in your browser and is not transmitted to us.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">10. Fonts</h2>
        <p class="mb-0">The fonts used on this site (Source Sans 3, Playfair Display) are stored and served from our own server. No connection to Google or another third-party font service is made when you view the site.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">11. Maps (OpenStreetMap)</h2>
        <p class="mb-0">Some event pages show an interactive map. The map tiles are loaded from tile.openstreetmap.org, operated by the OpenStreetMap Foundation (United Kingdom). When the map loads, your IP address is transmitted to that service so it can deliver the tiles. Legal basis: Art. 6(1)(f) GDPR (showing event locations clearly). Pages without a map do not contact this service. See the <a class="link-primary" href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener">OpenStreetMap Foundation privacy policy</a>.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">12. External links and social media</h2>
        <p class="mb-0">Links to our Instagram and Facebook pages are plain hyperlinks. We embed no social-media plugins, so opening this site does not contact those networks. Once you follow a link, the network processes your data under its own responsibility.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">13. Changes</h2>
        <p class="mb-0">We update this notice when our processing changes. The current version always applies.</p>
    </section>
</section>
""".strip(),
        },
    },
    "de": {
        "about": {
            "title": "Über uns",
            "image": "img/site/about-team.webp",
            "body_html": """
<section class="vstack gap-3">
    <p class="lead text-body-emphasis mb-0">
        INCAS steht für
        <span class="fw-bold text-primary">IN</span>terkulturelles
        <span class="fw-bold text-primary">C</span>entrum
        <span class="fw-bold text-primary">A</span>achener
        <span class="fw-bold text-primary">S</span>tudierender. Wir sind eine studentische Vereinigung, die sich mit Unterstützung des International Office der RWTH Aachen und des Akademischen Auslandsamtes der FH Aachen um die Betreuung internationaler Studierender, Studienkollegiaten, Praktikanten und Deutschkurs-TeilnehmerInnen kümmert. Das internationale Team setzt sich aus ausländischen und deutschen Studierenden zusammen.
    </p>
    <p class="text-body-secondary mb-0">
        Das Ziel ist es, den Kontakt und den kulturellen Austausch unter den Studierenden aller Nationen durch Integration und interkulturelle Kommunikation zu verbessern, sowie ihren Aufenthalt in Aachen durch Beratungsangebote und Hilfestellungen zu erleichtern. Finanzielle und logistische Unterstützung erhält das INCAS sowohl durch die RWTH als auch die FH.
    </p>
</section>
""".strip(),
        },
        "working_groups": {
            "title": "Arbeitsgruppen",
            "image": None,
            "body_html": """
<section class="vstack gap-4">
    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <p class="lead mb-2">
            Bei INCAS kümmern sich verschiedene Arbeitsgruppen um die einzelnen Aufgaben. Jede Gruppe wird von einem Gruppenleiter geleitet, der für die Aktivitäten in der Gruppe verantwortlich ist.
        </p>
        <p class="mb-0 text-body-secondary">
            Innerhalb der Arbeitsgruppen werden anstehende Veranstaltungen geplant, zukünftige Aktivitäten diskutiert und bisherige Projekte ausgewertet. Hier hast du die Möglichkeit, mitzuwirken und deine eigenen Ideen und Erfahrungen einzubringen. Dabei ist es dir selbst überlassen, wie stark du dich einbringen magst und wie viel Zeit du hast, dich zu engagieren.
        </p>
    </div>

    <p class="mb-0">Folgende Arbeitsgruppen gibt es zurzeit bei INCAS:</p>

    <div class="list-group list-group-flush border rounded-2 overflow-hidden">
        <section class="list-group-item py-3">
            <h2 class="h5 mb-2 text-primary-emphasis">Koordination</h2>
            <p class="mb-0">Zwei Studierende aus unserem Team sind immer hauptverantwortlich für die Leitung des INCAS. Sie behalten den Überblick über alle Aktivitäten, leiten die wöchentlichen Teamtreffen, stehen den Arbeitsgruppenleitern als Ansprechpartner zur Verfügung und repräsentieren INCAS nach außen.</p>
        </section>
        <section class="list-group-item py-3">
            <h2 class="h5 mb-2 text-primary-emphasis">Internationaler Dienstag und Café Lingua</h2>
            <p class="mb-0">Das Team organisiert ausgewählte Dienstagabende mit Länderabenden, Café Lingua, Quiz-, Musik- und Grillabenden. Aktuelle Termine und Formate stehen im Eventkalender. Beim Café Lingua können Gäste an mehreren Sprachtischen gemeinsam üben.</p>
        </section>
        <section class="list-group-item py-3">
            <h2 class="h5 mb-2 text-primary-emphasis">Internationales Wochenende</h2>
            <p class="mb-0">Einmal im Monat organisieren wir einen Tagesausflug zu einem Ziel innerhalb Deutschlands oder in die angrenzenden Nachbarländer. Unsere Arbeitsgruppe INCAS Wochenende ist zuständig für die Ideenfindung, Planung, Organisation und Begleitung der Gruppe am Tag des Ausflugs. Eine intensive Vorbereitung und Nachbereitung von jeder Exkursion werden durch das Team gewährleistet. Dazu gehören z.B. die Organisation eines Tagesprogramms, die Werbung für das Event, die Betreuung des Anmeldeprozesses, die finanzielle Kalkulation und später die Evaluation der Fahrt. Internationale Gäste, interessante Städte und ein abwechslungsreiches Programm machen jede Exkursion zu einem ganz besonderen Erlebnis.</p>
        </section>
        <section class="list-group-item py-3">
            <h2 class="h5 mb-2 text-primary-emphasis">Wohnungssuche und Servicezeit</h2>
            <p class="mb-0">Eine Unterkunft in einer neuen Stadt zu finden und dabei häufig noch mit dem Problem konfrontiert zu sein, die Sprache nicht zu beherrschen, ist eine große Herausforderung für jeden internationalen Studierenden. Das Team der Wohnungssuche steht dir mit Rat und Tat zur Seite. Die Servicezeit wird mehrmals die Woche angeboten. In diesen Zeiten könnt ihr in unser Büro im Humboldt-Haus kommen und uns Fragen stellen zu Mietverträgen, universitären Angelegenheiten oder anderen studentischen Problemen. Das Team der Servicezeit steht euch mehrsprachig zur Verfügung und beantwortet während dieser Zeit auch Fragen zur Wohnungssuche.</p>
        </section>
        <section class="list-group-item py-3">
            <h2 class="h5 mb-2 text-primary-emphasis">Sprachtandem</h2>
            <p class="mb-0">Das Problem kennst du vielleicht: Du besuchst einen Sprachkurs nach dem anderen, aber richtige Gespräche kannst du trotzdem noch nicht führen. Aus diesem Grund hat sich INCAS entschlossen, eine Datenbank aufzubauen, in der wir Tandemsuchende sammeln und vermitteln. Die Arbeitsgruppe Sprachtandem gibt euch auch gerne Tipps, wie ihr ein Tandem möglichst effektiv gestaltet und gleichzeitig sehr viel Spaß daran haben könnt. Dann seid ihr gefragt: Ihr trefft euch mit eurem Tandempartner wo und so oft ihr wollt. Mit ein bisschen Glück findet ihr einen guten Freund, verbessert miteinander eure Zielsprachen und lernt etwas über die Kultur des anderen.</p>
        </section>
        <section class="list-group-item py-3">
            <h2 class="h5 mb-2 text-primary-emphasis">Internationales Frühstück</h2>
            <p class="mb-0">Die Arbeitsgruppe Internationales Frühstück organisiert unser monatliches Samstagsfrühstück im Humboldt-Haus und die Anmeldung. Das genaue Datum, das vorgestellte Land oder die Kultur, die Kaution und freie Plätze stehen beim jeweiligen Event.</p>
        </section>
        <section class="list-group-item py-3">
            <h2 class="h5 mb-2 text-primary-emphasis">Öffentlichkeitsarbeit</h2>
            <p class="mb-0">Damit ihr immer auf dem Laufenden bleibt, welche Aktionen wir für Euch planen, und mehr Menschen von INCAS erfahren, übernimmt ein/e Studierende/r die Öffentlichkeitsarbeit. Dazu gehört die Aktualisierung der Website, der Facebookseite, das Design von Flyern und vieles mehr, was mit dem Auftreten von INCAS nach außen zu tun hat.</p>
        </section>
        <section class="list-group-item py-3">
            <h2 class="h5 mb-2 text-primary-emphasis">INCAS Aktiv</h2>
            <p class="mb-0">Neben unserem ständigem Programm versuchen wir immer wieder zusätzliche Aktivitäten für unsere Gäste anzubieten. Dazu zählen z.B. ein Besuch im Kletterwald, gemeinsames Schlittschuhlaufen oder Fußball spielen. INCAS Aktiv kümmert sich um Ideen, Organisation und Betreuung der Events. Hier könnt auch ihr gerne mit Ideen an uns herantreten.</p>
        </section>
    </div>
</section>
""".strip(),
        },
        "team_meetings": {
            "title": "Teamtreffen",
            "image": "img/site/team-meetings.webp",
            "body_html": """
<section class="vstack gap-4">
    <p class="lead mb-0">
        Einmal in der Woche treffen sich die aktiven INCAS Mitglieder, um sich auszutauschen, über die Aufgaben der Arbeitsgruppen zu berichten und neue Events zu planen. Wenn du Lust hast, bei INCAS mitzumachen und Teil unseres Teams zu werden, komm einfach bei unserem wöchentlichen Teamtreffen vorbei und du kannst mehr über unsere Arbeit und das Team erfahren.
    </p>
    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <p class="mb-0">
            Unser Teamtreffen findet jeden <strong class="text-primary-emphasis">Dienstag um 19:00 Uhr</strong> im <strong>INCAS Büro im Humboldt-Haus</strong> statt. Solltest du vorab Fragen zu unserer Arbeit oder unserem Teamtreffen haben, schreib uns einfach eine E-Mail.
        </p>
    </div>
</section>
""".strip(),
        },
        "board_game_nights": {
            "title": "Brettspielabende",
            "image": None,
            "body_html": """
<section class="vstack gap-4">
    <div>
        <h2 class="h3 text-body-emphasis">Gemeinsam spielen im Humboldt-Haus</h2>
        <p class="lead mb-0">An ausgewählten Internationalen Dienstagen veranstaltet INCAS Brettspielabende für Studierende, die in entspannter Atmosphäre neue Leute kennenlernen möchten.</p>
    </div>

    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <h3 class="h5 mb-2">Was dich erwartet</h3>
        <p class="mb-2">Du kannst ein Spiel von INCAS auswählen oder dein eigenes Spiel für den Abend mitbringen.</p>
        <p class="mb-0">Im Mittelpunkt stehen gemeinsames Spielen, einfache Gespräche und neue Kontakte. Du musst nicht mit einer eigenen Gruppe kommen.</p>
    </div>

    <section>
        <h2 class="h4 text-primary-emphasis">Wann findet es statt?</h2>
        <p class="mb-0">Brettspielabende sind kein festes wöchentliches Angebot. Termine werden im <a class="link-primary" href="/events">Eventkalender</a> und über unsere Social-Media-Kanäle angekündigt.</p>
    </section>
</section>
""".strip(),
        },
        "dance_workshops": {
            "title": "Tanzworkshops",
            "image": None,
            "body_html": """
<section class="vstack gap-4">
    <div>
        <h2 class="h3 text-body-emphasis">Einsteigerfreundliche Tanzabende</h2>
        <p class="lead mb-0">Normalerweise einmal pro Semester arbeitet INCAS mit Sol de la Salsa zusammen und bietet Tanzworkshops für Studierende an.</p>
    </div>

    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <h3 class="h5 mb-2">So läuft der Abend ab</h3>
        <p class="mb-2">Vorkenntnisse sind nicht nötig. Der Abend beginnt mit einem angeleiteten Kurs und geht danach in Zeit zum Üben über.</p>
        <p class="mb-0">Die Workshops sind als soziale Events gedacht, du kannst also auch ohne Tanzerfahrung einfach mitmachen.</p>
    </div>

    <section>
        <h2 class="h4 text-primary-emphasis">Aktuelle Termine</h2>
        <p class="mb-0">Tanzworkshop-Termine werden im <a class="link-primary" href="/events">Eventkalender</a> angekündigt, sobald die nächste Kooperation geplant ist.</p>
    </section>
</section>
""".strip(),
        },
        "international_breakfast": {
            "title": "Internationales Frühstück",
            "image": "img/site/international-breakfast.webp",
            "form": {
                "type": "suggest_event",
                "preset": {
                    "kind": "breakfast",
                },
            },
            "body_html": """
<section class="vstack gap-3">
    <p class="lead mb-0">
        Unser <strong>Internationales Frühstück</strong> ist ein monatlich stattfindendes Büffet, das dir einen entspannten und fröhlichen Start in den Tag erlaubt. Gleichzeitig hast du die Möglichkeit neue Menschen aus aller Welt zu treffen. Die Veranstaltung findet normalerweise an einem Samstag statt.
    </p>
    <p class="mb-0">
        Gegen eine kleine Aufwandsentschädigung kannst du so viel essen wie du magst oder so lange noch etwas da ist. Je nach Veranstaltung bieten wir Spezialitäten aus anderen Ländern oder ein eher typisch deutsches Frühstück mit, z.B., frischen Brötchen, Butter, Käse und Aufschnitt, Müsli, Joghurt, Obst, Saft, Kaffee und Tee.
    </p>
    <p class="mb-0">
        Für genaue Informationen schau auf dieser Website, <a class="link-primary" title="Facebook Website INCAS Aachen" href="https://www.facebook.com/INCASAachen/" target="_blank" rel="noopener">Facebook</a> oder <a class="link-primary" title="INCAS Instagram Page" href="https://www.instagram.com/incas_aachen/" target="_blank" rel="noopener">Instagram</a> oder frag uns einfach bei einem Internationalen Dienstag.
    </p>
    <p class="mb-0 fw-semibold text-body-emphasis">Wir freuen uns auf dich!</p>
</section>
""".strip(),
        },
        "international_weekend": {
            "title": "Internationales Wochenende",
            "image": "img/site/international-weekend.webp",
            "body_html": """
<section class="vstack gap-4">
    <div>
        <h2 class="h3 text-body-emphasis">Aachen und Umgebung entdecken</h2>
        <p class="lead mb-3">Du bist neu in Aachen, möchtest die Umgebung erkunden, neue Freunde finden und mehr über Kultur und Geschichte erfahren?</p>
        <p class="mb-0">Dann solltest du uns auf ein <strong>Internationales Wochenende</strong> begleiten. INCAS organisiert einmal monatlich einen Tagestrip in eine Stadt oder zu einer Sehenswürdigkeit in Deutschland, Belgien, den Niederlanden oder Luxemburg.</p>
    </div>

    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <h3 class="h5 mb-2">Was dich erwartet</h3>
        <p class="mb-2">Unsere Trips enthalten normalerweise eine Stadtführung, eine Führung in einem Museum oder den Besuch einer Sehenswürdigkeit. Wir haben schon Luxemburg besucht, die Untergrundhöhlen in Maastricht besichtigt und sind auf den Drachenfels nahe Bonn gewandert.</p>
        <p class="mb-0">Jeden Monat bieten wir ein anderes Ziel an.</p>
    </div>

    <section>
        <h2 class="h4 text-primary-emphasis">Anmeldung und Kosten</h2>
        <p class="mb-0">Jede Tour wird im Voraus auf unserer Website und über unsere Social-Media-Kanäle angekündigt. Den aktuellen Ticketpreis, die Kapazität und alle Anmeldeinformationen findest du bei der Eventbeschreibung.</p>
    </section>

    <section>
        <h2 class="h4 text-body-emphasis">FAQ</h2>
        <div class="accordion" id="international-weekend-faq-de">
            <div class="accordion-item">
                <h3 class="accordion-header">
                    <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#international-weekend-faq-de-1" aria-expanded="true" aria-controls="international-weekend-faq-de-1">Wann finden die Fahrten statt?</button>
                </h3>
                <div id="international-weekend-faq-de-1" class="accordion-collapse collapse show" data-bs-parent="#international-weekend-faq-de">
                    <div class="accordion-body">Die Fahrten finden monatlich an einem Samstag statt. Das genaue Datum wird zwei bis drei Wochen vorher bekanntgegeben.</div>
                </div>
            </div>
            <div class="accordion-item">
                <h3 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#international-weekend-faq-de-2" aria-expanded="false" aria-controls="international-weekend-faq-de-2">Wie kann ich mich anmelden?</button>
                </h3>
                <div id="international-weekend-faq-de-2" class="accordion-collapse collapse" data-bs-parent="#international-weekend-faq-de">
                    <div class="accordion-body">Du meldest dich über den Kontakt oder Link an, der in der Eventbeschreibung angegeben ist.</div>
                </div>
            </div>
            <div class="accordion-item">
                <h3 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#international-weekend-faq-de-3" aria-expanded="false" aria-controls="international-weekend-faq-de-3">Kann ich auch Freunde anmelden?</button>
                </h3>
                <div id="international-weekend-faq-de-3" class="accordion-collapse collapse" data-bs-parent="#international-weekend-faq-de">
                    <div class="accordion-body">Jeder kann nur eine Person anmelden, also entweder sich selbst oder einen Freund. Gruppen können nicht von einer Person angemeldet werden.</div>
                </div>
            </div>
            <div class="accordion-item">
                <h3 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#international-weekend-faq-de-4" aria-expanded="false" aria-controls="international-weekend-faq-de-4">In welcher Sprache sind die Führungen?</button>
                </h3>
                <div id="international-weekend-faq-de-4" class="accordion-collapse collapse" data-bs-parent="#international-weekend-faq-de">
                    <div class="accordion-body">Die Führungen sind normalerweise auf Englisch. In Museen kann es Audioguides in Deutsch, Spanisch, Französisch oder weiteren Sprachen geben, aber das können wir nicht garantieren.</div>
                </div>
            </div>
            <div class="accordion-item">
                <h3 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#international-weekend-faq-de-5" aria-expanded="false" aria-controls="international-weekend-faq-de-5">Wer darf teilnehmen?</button>
                </h3>
                <div id="international-weekend-faq-de-5" class="accordion-collapse collapse" data-bs-parent="#international-weekend-faq-de">
                    <div class="accordion-body">Studierende der RWTH Aachen und FH Aachen, Teilnehmende an Kursen der Sprachenakademie und Doktorandinnen und Doktoranden können teilnehmen.</div>
                </div>
            </div>
            <div class="accordion-item">
                <h3 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#international-weekend-faq-de-6" aria-expanded="false" aria-controls="international-weekend-faq-de-6">Gibt es Mehrtagesfahrten?</button>
                </h3>
                <div id="international-weekend-faq-de-6" class="accordion-collapse collapse" data-bs-parent="#international-weekend-faq-de">
                    <div class="accordion-body">Wir bieten normalerweise Tagesfahrten an. Falls ausnahmsweise eine Mehrtagesfahrt geplant ist, informieren wir euch rechtzeitig.</div>
                </div>
            </div>
        </div>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Noch Fragen?</h2>
        <p class="mb-0">Kontaktiere uns einfach über unsere <a class="link-primary" href="/contacts">Kontaktseite</a>. Wir freuen uns auf dich.</p>
    </section>
</section>
""".strip(),
        },
        "cafe_lingua": {
            "title": "Café Lingua",
            "image": "img/site/cafe-lingua.webp",
            "body_html": """
<section class="vstack gap-4">
    <div>
        <h2 class="h3 text-body-emphasis">Sprachen gemeinsam üben</h2>
        <p class="lead mb-3">Fremdsprachen lernt man am besten durch Praxis, Spaß und kulturellen Austausch.</p>
        <p class="mb-0">Unser <strong>Café Lingua</strong> bietet dir genau diese Möglichkeit.</p>
    </div>

    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <h3 class="h5 mb-2">So funktioniert es</h3>
        <p class="mb-0">Café Lingua findet an ausgewählten Dienstagabenden statt, die im Eventkalender angekündigt werden. Dort kannst du mit Muttersprachler:innen in kleinen Gruppen deine Fremdsprache anwenden und verbessern.</p>
    </div>

    <section>
        <h2 class="h4 text-primary-emphasis">Sprachtandem und Café Lingua</h2>
        <p class="mb-0">Es spielt keine Rolle, ob du bereits für das <a class="link-primary" href="/offers/language-tandem">Sprachtandem</a> angemeldet bist oder schon eine Partnerin oder einen Partner hast. Je mehr du übst, desto besser. Vielleicht findest du hier sogar jemanden für regelmäßiges Üben.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Aktuelle Termine</h2>
        <p class="mb-0">Aktuelle Termine findest du immer in unserem <a class="link-primary" href="/events">Eventkalender</a>. Auf die Plätze, fertig, Café Lingua.</p>
    </section>
</section>
""".strip(),
        },
        "incas_active": {
            "title": "INCAS Aktiv",
            "image": "img/site/incas-active.webp",
            "body_html": """
<section class="vstack gap-4">
    <div>
        <h2 class="h3 text-body-emphasis">Aktivitäten mit dem INCAS-Team</h2>
        <p class="lead mb-3">Neben den vielen Aktivitäten, die wir für Studierende in Aachen anbieten, machen wir auch Aktivitäten nur für unser Team.</p>
        <p class="mb-0">Das reicht von Teambuilding-Events bis hin zu einfach nur Spaß miteinander haben. So lernen wir uns besser kennen und entwickeln uns als Team weiter.</p>
    </div>

    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <h3 class="h5 mb-2">Beispiele</h3>
        <p class="mb-0">Wanderungen, Festivalbesuche, Grillpartys, Eisessen im Park, Escape Rooms und ähnliche Aktivitäten sind möglich. Teammitglieder können neue Ideen bequem über ein Online-Formular vorschlagen.</p>
    </div>

    <section>
        <h2 class="h4 text-primary-emphasis">Mach mit</h2>
        <p class="mb-0">Wenn auch du Lust hast, an diesen Aktivitäten teilzunehmen, dann komm in unser Team. Wir freuen uns auf dich und heißen neue Mitglieder herzlich willkommen.</p>
    </section>
</section>
""".strip(),
        },
        "country_evening": {
            "title": "Länderabend",
            "image": "img/site/country-evening.webp",
            "body_html": """
<section class="vstack gap-4">
    <div>
        <h2 class="h3 text-body-emphasis">Ein Land vorstellen</h2>
        <p class="lead mb-3">Jeden Monat widmen wir einen Internationalen Dienstag der Präsentation eines Landes.</p>
        <p class="mb-0">Kommilitoninnen und Kommilitonen vermitteln authentische Eindrücke aus ihrem Heimatland: Fakten, Bilder, typische Köstlichkeiten zum Probieren, Musik, Tanz und manchmal traditionelle Kleidung.</p>
    </div>

    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <h3 class="h5 mb-2">Nach der Präsentation</h3>
        <p class="mb-0">Im Anschluss könnt ihr Fragen stellen, euch über den Abend austauschen und in entspannter Atmosphäre neue Leute kennenlernen.</p>
    </div>

    <section>
        <h2 class="h4 text-primary-emphasis">Präsentiert eure Heimat</h2>
        <p>Würdet ihr uns gerne euer Herkunftsland vorstellen? Ihr könnt die Themen selbst wählen: Kultur, Geografie, Wirtschaft, Nationalsport, einen interessanten Film, einen Tanz oder eine Mischung aus allem.</p>
        <p>Wir unterstützen euch gerne bei der Vorbereitung. Die Präsentation sollte auf Deutsch oder Englisch erfolgen.</p>
        <p class="mb-0">Teilt Eindrücke aus eurem Land mit der internationalen Community in Aachen.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Mitmachen</h2>
        <p class="mb-0">Wenn du dein Land vorstellen möchtest, <a class="link-primary" href="/suggest-event?kind=country_evening">schlage einen Länderabend vor</a> oder <a class="link-primary" href="/contact-form">kontaktiere uns</a>.</p>
    </section>
</section>
""".strip(),
        },
        "international_tuesday": {
            "title": "Internationaler Dienstag",
            "image": "img/site/international-tuesday.webp",
            "form": {
                "type": "suggest_event",
                "preset": {
                    "kind": "country_evening",
                },
            },
            "body_html": """
<section class="vstack gap-4">
    <div>
        <h2 class="h3 text-body-emphasis">Die Welt wartet auf dich!</h2>
        <p class="lead mb-3">Die Abteilung "Internationaler Dienstag" ist die Hauptcrew hinter den Veranstaltungen, die dienstags im Humboldt-Haus stattfinden.</p>
        <p class="mb-0">Beim Internationalen Dienstag treffen sich Studierende aus aller Welt zu ausgewählten Dienstagabenden. Das Programm wechselt zwischen Kulturvorstellungen, Spielen, Musik und anderen sozialen Formaten.</p>
    </div>

    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <h3 class="h5 mb-2">Wann und wo findet er statt?</h3>
        <p class="mb-1"><strong class="text-primary-emphasis">Dienstagabends, normalerweise ab 20:00 Uhr</strong></p>
        <p class="mb-0">Den nächsten bestätigten Termin und das Format findest du im Eventkalender.</p>
        <p class="mb-0">Humboldt-Haus, Pontstraße 41</p>
    </div>

    <div>
        <h2 class="h4 text-body-emphasis">Regelmäßiges Programm</h2>
        <p>Im Rahmen des Internationalen Dienstag bieten wir immer wieder besondere Veranstaltungen an:</p>
        <ul class="list-group list-group-flush border rounded-2 overflow-hidden">
            <li class="list-group-item">Länderabend</li>
            <li class="list-group-item"><a class="link-primary" href="/offers/cafe-lingua">Café Lingua</a></li>
            <li class="list-group-item">Grillabende im Sommer</li>
            <li class="list-group-item">Musikabende</li>
            <li class="list-group-item">Osterfeier</li>
            <li class="list-group-item">Weihnachtsfeier</li>
            <li class="list-group-item">Und vieles mehr</li>
        </ul>
    </div>

    <p class="mb-0">Die aktuellen Informationen über unsere Veranstaltungen erhältst du in unserem <a class="link-primary" href="/events">Eventkalender</a>. Das INCAS-Team und unsere deutschen und ausländischen Gäste freuen sich darauf, dich kennen zu lernen.</p>

    <hr class="my-2">

    <section>
        <h2 class="h4 text-primary-emphasis">Länderabende</h2>
        <p>Würdet ihr uns gerne euer Herkunftsland vorstellen? Kein Problem! Bei uns habt ihr die Möglichkeit. Wir stellen euch gerne einen Laptop und einen Beamer zur Verfügung. Wollt ihr uns auch noch einige leckere Gerichte aus eurem Land präsentieren? Toll! Wir unterstützen euch dabei gerne mit unserer Hilfe und auch finanziell. Sprecht uns einfach an. Wir sind für eure Vorschläge offen.</p>
    </section>
    <section>
        <h2 class="h4 text-primary-emphasis">Grillabende</h2>
        <p>Im Sommer bei schönem Wetter grillen wir zusammen. Wir, als INCAS-Team, stellen euch verschiedene Salate, Brot und Kleinigkeiten kostenlos zur Verfügung. Außerdem machen wir einen Grill fertig, auf dem ihr euer mitgebrachtes Fleisch oder Würstchen grillen könnt.</p>
    </section>
    <section>
        <h2 class="h4 text-primary-emphasis">Musikabende</h2>
        <p>Könnt ihr singen oder habt ihr Lust Stücke auf einem Instrument zu spielen? Dann seid ihr bei uns herzlich willkommen! Wir und eure Freunde bei INCAS werden uns sehr freuen, eure Kunststücke zu hören oder zu sehen.</p>
    </section>
    <section>
        <h2 class="h4 text-primary-emphasis">Besondere Feiertage</h2>
        <p>Wie feiert man eigentlich Ostern und Weihnachten in Deutschland? Kennt ihr die Traditionen? Kennt ihr die Unterschiede zu eurem Land? Dann kommt einfach bei uns vorbei. Wir feiern mit euch und zeigen euch wie schön es hier sein kann. Wir bemalen mit euch Ostereier, kochen zusammen leckere Speisen, backen Plätzchen und singen Weihnachtslieder. Und noch viel mehr. Lasst euch überraschen!</p>
    </section>
    <section>
        <h2 class="h4 text-primary-emphasis">Du hast noch eigene Ideen?</h2>
        <p>Ihr habt noch weitere Ideen oder Fragen zum Internationalen Dienstag? <a class="link-primary" href="/contact-form">Kontaktiert uns</a> einfach.</p>
        <p class="mb-0">Wir freuen uns über eure Rückmeldungen,<br>das INCAS Team</p>
    </section>
</section>
""".strip(),
        },
        "language_tandem": {
            "title": "Sprachtandem",
            "image": "img/site/language-tandem.webp",
            "form": {
                "type": "language_tandem",
            },
            "body_html": """
<section class="vstack gap-4">
    <div>
        <h2 class="h3 text-body-emphasis">Zu zweit, in kleinen Gruppen</h2>
        <p class="lead mb-3">Eine Sprache nur aus Büchern zu erlernen, ist nicht nur langweilig, sondern führt auch nie zum gewünschten Erfolg. Was wirklich hilft, ist reden.</p>
        <p class="mb-0">Bei der Suche nach einem passenden Partner für deine Wunschsprache hilft dir das Sprachtandem-Angebot von INCAS weiter.</p>
    </div>

    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <p class="mb-2">Um dich für das Sprachtandem zu registrieren, fülle einfach das Formular auf dieser Seite aus.</p>
        <a class="btn btn-primary" href="#page-form">Zum Sprachtandem-Formular</a>
    </div>

    <p class="mb-0">Seit dem 01. Oktober 2013 wurden mehr als <strong class="text-primary-emphasis">690</strong> Teilnehmer vermittelt.</p>

    <section>
        <h2 class="h4 text-primary-emphasis">Oder mit ganz vielen</h2>
        <p>Das Café Lingua ist das internationale Sprachcafé beim INCAS. Hier kommen interessierte Studierende an Sprachtischen zusammen und unterhalten sich über alles, was ihnen so einfällt.</p>
        <p class="mb-0">Ist deine Sprache noch nicht dabei, kannst du einen Stammtisch ins Leben rufen. Schreibe uns dazu einfach eine E-Mail und wir besprechen das weitere Vorgehen.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Was ist ein Sprachtandem?</h2>
        <p>Die grundlegende Idee ist, zwei Menschen unterschiedlicher Muttersprachen miteinander in Kontakt zu bringen, so dass sie die Sprache des jeweils anderen lernen.</p>
        <p>Wie ihr eure Treffen gestaltet, bleibt vollkommen euch überlassen. Ihr könnt Grammatik pauken, oder über Filme, Bücher und das letzte Wochenende diskutieren. Und ganz nebenbei habt ihr die Möglichkeit, euren kulturellen Erfahrungsschatz zu erweitern und interessante Kontakte zu knüpfen.</p>
        <p class="mb-0">Hier habt ihr die Möglichkeit, das, was ihr im Unterricht gelernt habt, kostenlos und realitätsnah anzuwenden und zu verbessern.</p>
    </section>

    <section>
        <h2 class="h4 text-body-emphasis">Wie läuft das Ganze ab?</h2>
        <ol class="list-group list-group-numbered">
            <li class="list-group-item">
                <div class="fw-semibold text-body-emphasis">Die Anmeldung</div>
                <p class="mb-0">Wenn ihr einen Sprachtandempartner sucht, müsst ihr zunächst das <a class="link-primary" href="#page-form">Sprachtandemformular</a> ausfüllen. Bitte beachtet dabei, nur die Sprachen anzuklicken, die ihr unterrichten könnt und lernen möchtet. Weitere Sprachen könnt ihr gerne im Kommentarfeld angeben. So ist sichergestellt, dass wir euch auch das richtige Tandem vermitteln.</p>
            </li>
            <li class="list-group-item">
                <div class="fw-semibold text-body-emphasis">Wie euch INCAS eine Partnerin oder einen Partner vermittelt</div>
                <p class="mb-0">Sobald wir eine Partnerin oder einen Partner gefunden haben, schicken wir euch den Kontakt. Es bleibt dann euch überlassen, den Kontakt aufzunehmen.</p>
            </li>
            <li class="list-group-item">
                <div class="fw-semibold text-body-emphasis">Wenn du eine Sprachtandem-Partnerin oder einen Sprachtandem-Partner hast</div>
                <p class="mb-0">Wie ihr das Tandem gestaltet, ist eure Sache. Hilfreich ist, wenn ihr euch bei euren Treffen Beschäftigungen sucht, die Gesprächsstoff liefern, wie z.B. typische Gerichte kochen, Ausgehen oder richtig Lernen. Eurer Kreativität sind keine Grenzen gesetzt.</p>
            </li>
        </ol>
    </section>

    <section>
        <h2 class="h4 text-body-emphasis">Noch Fragen?</h2>
        <div class="accordion" id="language-tandem-faq-de">
            <div class="accordion-item">
                <h3 class="accordion-header">
                    <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#language-tandem-faq-de-1" aria-expanded="true" aria-controls="language-tandem-faq-de-1">Was tust du, wenn das Tandem nicht so recht funktioniert?</button>
                </h3>
                <div id="language-tandem-faq-de-1" class="accordion-collapse collapse show" data-bs-parent="#language-tandem-faq-de">
                    <div class="accordion-body">Schreibe uns eine E-Mail und wir werden dir eine neue Partnerin oder einen neuen Partner suchen.</div>
                </div>
            </div>
            <div class="accordion-item">
                <h3 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#language-tandem-faq-de-2" aria-expanded="false" aria-controls="language-tandem-faq-de-2">Du befürchtest, dass deine Sprachkenntnisse für ein Sprachtandem ungenügend sind?</button>
                </h3>
                <div id="language-tandem-faq-de-2" class="accordion-collapse collapse" data-bs-parent="#language-tandem-faq-de">
                    <div class="accordion-body">Bewirb dich trotzdem, in der Regel findet sich auch bei geringen Sprachkenntnissen ein Partner. Falls du Interesse hast, einen Studierenden aus einem Land kennen zu lernen, dessen Sprache du nicht beherrschst, z.B. Chinesisch, dann besteht auch die Möglichkeit der Vermittlung eines kulturellen Austausches.</div>
                </div>
            </div>
            <div class="accordion-item">
                <h3 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#language-tandem-faq-de-3" aria-expanded="false" aria-controls="language-tandem-faq-de-3">Du möchtest anderen von deiner Sprachtandem-Erfahrung berichten?</button>
                </h3>
                <div id="language-tandem-faq-de-3" class="accordion-collapse collapse" data-bs-parent="#language-tandem-faq-de">
                    <div class="accordion-body">Schreibe uns von deinen Erfahrungen. Die schönsten Berichte veröffentlichen wir dann auf unserer Homepage, um einen besseren Eindruck von der möglichen Vielfalt des Sprachtandems zu vermitteln.</div>
                </div>
            </div>
        </div>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Kontakt</h2>
        <p>Wenn du noch Fragen oder Vorschläge zu unseren Sprachangeboten hast, schreibe uns einfach über das <a class="link-primary" href="/contact-form">Kontaktformular</a>.</p>
        <p class="mb-0">Wir freuen uns über deine Rückmeldungen,<br>dein INCAS Team</p>
    </section>
</section>
""".strip(),
        },
        "impressum": {
            "title": "Impressum",
            "image": None,
            "body_html": """
<section class="vstack gap-4">
    <p class="text-body-secondary mb-0">Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz).</p>

    <section>
        <h2 class="h4 text-primary-emphasis">Anbieter</h2>
        <p class="mb-0">
            Interkulturelles Centrum Aachener Studierender e.V.<br>
            Pontstraße 41<br>
            52062 Aachen<br>
            Deutschland
        </p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Registereintrag</h2>
        <p class="mb-0">Vereinsregister: VR 5770<br>Registergericht: Amtsgericht Aachen</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Vertreten durch</h2>
        <p class="mb-0">1. Koordinator: Nölke, Linus Ary<br>2. Koordinatorin: Rzaev, Vladmir</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Kontakt</h2>
        <p class="mb-0">Telefon: +49 241 80 98184<br>Schriftlicher Kontakt: <a class="link-primary" href="/contact-form">Kontaktformular</a></p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Verbraucherstreitbeilegung</h2>
        <p class="mb-0">Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Haftung für Inhalte und Links</h2>
        <p>Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Wir sind nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
        <p class="mb-0">Unsere Seite verweist auf externe Websites, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte verlinkter Seiten ist stets deren Anbieter verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf Rechtsverstöße überprüft; rechtswidrige Inhalte waren nicht erkennbar.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">Datenschutz</h2>
        <p class="mb-0">Wie wir mit personenbezogenen Daten umgehen, steht in unserer <a class="link-primary" href="/privacy">Datenschutzerklärung</a>.</p>
    </section>
</section>
""".strip(),
        },
        "privacy": {
            "title": "Datenschutzerklärung",
            "image": None,
            "body_html": """
<section class="vstack gap-4">
    <p class="text-body-secondary mb-0">Diese Erklärung beschreibt, welche personenbezogenen Daten wir bei der Nutzung dieser Website verarbeiten, auf welcher Rechtsgrundlage und welche Rechte Sie haben (Art. 13 DSGVO). Stand: September 2026.</p>

    <section>
        <h2 class="h4 text-primary-emphasis">1. Verantwortliche Stelle</h2>
        <p class="mb-0">
            Interkulturelles Centrum Aachener Studierender e.V.<br>
            Pontstraße 41, 52062 Aachen, Deutschland<br>
            Telefon: +49 241 80 98184 · <a class="link-primary" href="/contact-form">Kontaktformular</a>
        </p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">2. Ihre Rechte</h2>
        <p>Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen, die auf unserem berechtigten Interesse beruhen (Art. 21). Beruht eine Verarbeitung auf Ihrer Einwilligung, können Sie diese jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3).</p>
        <p class="mb-0">Ihnen steht außerdem ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde zu. Für uns zuständig ist die Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">3. Rechtsgrundlagen</h2>
        <p class="mb-0">Je nach Zweck stützen wir uns auf Ihre Einwilligung (Art. 6 Abs. 1 lit. a, für besondere Datenkategorien Art. 9 Abs. 2 lit. a), auf die Erfüllung eines Vertrags oder auf Ihr Verlangen erfolgende vorvertragliche Maßnahmen (Art. 6 Abs. 1 lit. b), auf eine rechtliche Verpflichtung (Art. 6 Abs. 1 lit. c) oder auf unser berechtigtes Interesse an einem sicheren und effizienten Betrieb der Vereinsangebote (Art. 6 Abs. 1 lit. f).</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">4. Hosting und Server-Logfiles</h2>
        <p>Diese Website läuft auf gehosteter Serverinfrastruktur. Beim Aufruf einer Seite schreibt die Hosting-Umgebung automatisch technische Daten in Server-Logfiles: Browsertyp und -version, Betriebssystem, Referrer-URL, Hostname, die anfragende IP-Adresse und den Zeitpunkt der Anfrage. Diese Daten werden auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO für den sicheren und stabilen Betrieb der Website verarbeitet und nicht mit anderen Datenquellen zusammengeführt.</p>
        <p class="mb-0">Sofern wir einen Hoster einsetzen, der personenbezogene Daten in unserem Auftrag verarbeitet, schließen wir mit ihm einen Auftragsverarbeitungsvertrag nach Art. 28 DSGVO.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">5. Daten aus Formularen</h2>
        <p>Wir erheben nur, was zur Bearbeitung Ihres Anliegens nötig ist. Freitextfelder sind freiwillig; bitte geben Sie dort keine besonderen Datenkategorien (z. B. Gesundheit, Religion, politische Ansichten) an, sofern dies nicht für Ihr Anliegen erforderlich ist. Tun Sie es dennoch, verarbeiten wir diese Angaben auf Grundlage Ihrer mit dem Absenden erteilten Einwilligung nach Art. 9 Abs. 2 lit. a DSGVO.</p>
        <div class="list-group list-group-flush border rounded-2 overflow-hidden">
            <section class="list-group-item py-3">
                <h3 class="h6 mb-1">Kontaktformular</h3>
                <p class="mb-0">Name, E-Mail-Adresse, optionaler Betreff, Nachricht. Zweck: Beantwortung Ihrer Anfrage. Rechtsgrundlage: Art. 6 Abs. 1 lit. b, soweit es um die Teilnahme an unseren Angeboten geht, sonst Art. 6 Abs. 1 lit. f.</p>
            </section>
            <section class="list-group-item py-3">
                <h3 class="h6 mb-1">Event-Vorschlag</h3>
                <p class="mb-0">Kontaktname, E-Mail-Adresse und/oder Telefonnummer, vorgeschlagenes Land bzw. vorgeschlagene Kultur, optionaler Kommentar. Zweck: Prüfung und Nachverfolgung Ihres Vorschlags. Rechtsgrundlage: Art. 6 Abs. 1 lit. f.</p>
            </section>
            <section class="list-group-item py-3">
                <h3 class="h6 mb-1">Sprachtandem-Anmeldung</h3>
                <p class="mb-0">Vor- und Nachname, E-Mail-Adresse, Tätigkeit, Geschlecht, Geburtsjahr, geplantes Abreisedatum, Herkunftsland, die angebotenen und gesuchten Sprachen mit Ihrer Selbsteinschätzung des Niveaus, Partnerpräferenzen und ein optionaler Kommentar. Zweck: Suche und Vorschlag einer Tandempartnerin oder eines Tandempartners und Kontaktaufnahme dazu. Rechtsgrundlage: Art. 6 Abs. 1 lit. b für den von Ihnen gewünschten Vermittlungsdienst; für freiwillige Angaben besonderer Kategorien im Kommentar: Art. 9 Abs. 2 lit. a.</p>
            </section>
            <section class="list-group-item py-3">
                <h3 class="h6 mb-1">Event-Anmeldung</h3>
                <p class="mb-0">Vor- und Nachname, E-Mail-Adresse, Tätigkeit, ein optionaler Kommentar und, bei Frühstücks-Events, Ihre Ernährungspräferenz. Zweck: Verwaltung Ihres Platzes, der Warteliste und, sofern eine Kaution oder ein Ticket anfällt, der Zahlung. Rechtsgrundlage: Art. 6 Abs. 1 lit. b; die Ernährungspräferenz wird auf Grundlage Ihrer mit der Auswahl erteilten Einwilligung verarbeitet (Art. 6 Abs. 1 lit. a, und Art. 9 Abs. 2 lit. a, soweit sie Rückschlüsse auf Religion oder Gesundheit zulässt).</p>
            </section>
            <section class="list-group-item py-3">
                <h3 class="h6 mb-1">Karaoke-Warteschlange</h3>
                <p class="mb-0">Anzeigename, Titel und Interpret, eine optionale Notiz und eine optionale Kontaktangabe. Zweck: Betrieb der Karaoke-Warteschlange während einer Veranstaltung. Rechtsgrundlage: Art. 6 Abs. 1 lit. a / lit. f.</p>
            </section>
        </div>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">6. Empfänger</h2>
        <p>Zugriff auf Ihre Daten haben die INCAS-Ehrenamtlichen, die das jeweilige Angebot organisieren. Beim Sprachtandem erfolgt das Matching über eine pseudonymisierte Admin-Ansicht; Namen und Kontaktdaten sehen nur die Ehrenamtlichen, die die konkrete Vermittlung durchführen.</p>
        <p class="mb-0">An Dritte geben wir Daten nur weiter, soweit erforderlich: an einen Hoster (siehe Abschnitt 4), an den Betreiber des Mailservers, über den wir transaktionale E-Mails wie einen Anmeldungslink versenden, und – bei Events mit Kaution oder Ticket – an einen Zahlungsdienstleister. Zahlung und Social-Media-Veröffentlichung laufen derzeit in einem simulierten Modus, in dem keine echten Zahlungsdaten übertragen werden; diese Erklärung wird vor dem Einsatz eines echten Anbieters aktualisiert.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">7. Speicherdauer</h2>
        <p class="mb-0">Wir speichern personenbezogene Daten nur so lange, wie es für den Erhebungszweck oder zur Erfüllung einer gesetzlichen Aufbewahrungspflicht erforderlich ist, und löschen sie danach. Sie können jederzeit über die oben genannten Kontaktdaten die Löschung Ihrer Daten verlangen; wir kommen dem nach, sofern keine gesetzliche Pflicht zur Aufbewahrung besteht.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">8. Datensicherheit</h2>
        <p class="mb-0">Die Website wird über HTTPS (TLS) ausgeliefert. Der Admin-Zugang ist durch ablaufende Zugangsschlüssel geschützt und in getrennte Berechtigungen unterteilt, sodass eine ehrenamtliche Person nur die für ihre Aufgabe nötigen Daten sieht; die Sprachtandem-Matching-Ansicht ist konzeptionell pseudonymisiert (Art. 25, Art. 32 DSGVO).</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">9. Cookies und lokaler Speicher</h2>
        <p>Wir verwenden keine Tracking- oder Werbe-Cookies und zeigen kein Einwilligungsbanner. Wir setzen zwei Cookies, beide unbedingt erforderlich und nach § 25 Abs. 2 TDDDG einwilligungsfrei: ein <code>locale</code>-Cookie, das deine Sprachwahl speichert, und ein Session-Cookie, das erst nach der Anmeldung einer Admin-Person erstellt wird und diese Sitzung aufrechterhält.</p>
        <p class="mb-0">Der lokale Speicher Ihres Browsers hält einige Einstellungen ausschließlich auf Ihrem Gerät: Ihre Hell-/Dunkel-Präferenz, Ihre Sprachwahl und – wenn Sie einer Karaoke-Warteschlange beitreten – eine zufällige Kennung, damit Sie Ihren eigenen Eintrag verwalten können. Diese Angaben verbleiben in Ihrem Browser und werden nicht an uns übertragen.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">10. Schriftarten</h2>
        <p class="mb-0">Die auf dieser Website verwendeten Schriftarten (Source Sans 3, Playfair Display) werden auf unserem eigenen Server gespeichert und ausgeliefert. Beim Aufruf der Website wird keine Verbindung zu Google oder einem anderen Drittanbieter für Schriftarten hergestellt.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">11. Karten (OpenStreetMap)</h2>
        <p class="mb-0">Einzelne Event-Seiten zeigen eine interaktive Karte. Das Kartenmaterial wird von tile.openstreetmap.org geladen, betrieben von der OpenStreetMap Foundation (Vereinigtes Königreich). Beim Laden der Karte wird Ihre IP-Adresse an diesen Dienst übertragen, damit die Kacheln ausgeliefert werden können. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (übersichtliche Darstellung von Veranstaltungsorten). Seiten ohne Karte kontaktieren diesen Dienst nicht. Siehe die <a class="link-primary" href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener">Datenschutzerklärung der OpenStreetMap Foundation</a>.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">12. Externe Links und soziale Medien</h2>
        <p class="mb-0">Links zu unseren Instagram- und Facebook-Seiten sind einfache Hyperlinks. Wir binden keine Social-Media-Plugins ein, sodass der Aufruf dieser Website diese Netzwerke nicht kontaktiert. Sobald Sie einem Link folgen, verarbeitet das jeweilige Netzwerk Ihre Daten in eigener Verantwortung.</p>
    </section>

    <section>
        <h2 class="h4 text-primary-emphasis">13. Änderungen</h2>
        <p class="mb-0">Wir aktualisieren diese Erklärung, wenn sich unsere Verarbeitung ändert. Es gilt stets die aktuelle Fassung.</p>
    </section>
</section>
""".strip(),
        },
    },
}

_ABOUT_PAGE_KEYS = {"about", "working_groups", "team_meetings"}
_LEGAL_PAGE_KEYS = {"impressum", "privacy"}
_OFFER_PAGE_KEYS = {
    "board_game_nights",
    "dance_workshops",
    "international_breakfast",
    "international_weekend",
    "cafe_lingua",
    "incas_active",
    "country_evening",
    "international_tuesday",
    "language_tandem",
}
_IMAGE_DIMENSIONS = {
    "img/site/about-team.webp": (1600, 1200),
    "img/site/team-meetings.webp": (959, 379),
    "img/site/international-breakfast.webp": (647, 272),
    "img/site/international-weekend.webp": (512, 384),
    "img/site/cafe-lingua.webp": (648, 313),
    "img/site/incas-active.webp": (699, 349),
    "img/site/country-evening.webp": (989, 345),
    "img/site/international-tuesday.webp": (1021, 476),
    "img/site/language-tandem.webp": (1022, 452),
}
_IMAGE_ALT = {
    "en": {
        "about": "INCAS volunteers meeting at Humboldt-Haus in Aachen",
        "team_meetings": "Students taking part in an INCAS team meeting",
        "international_breakfast": "Guests sharing an international breakfast buffet",
        "international_weekend": "INCAS participants exploring a day-trip destination",
        "cafe_lingua": "Students talking together at Café Lingua",
        "incas_active": "INCAS students taking part in a group activity",
        "country_evening": "Students presenting music and culture at a Country Evening",
        "international_tuesday": "Students meeting at an INCAS Tuesday event",
        "language_tandem": "Two students practising languages together",
    },
    "de": {
        "about": "INCAS-Ehrenamtliche bei einem Treffen im Humboldt-Haus in Aachen",
        "team_meetings": "Studierende bei einem INCAS-Teamtreffen",
        "international_breakfast": "Gäste an einem internationalen Frühstücksbuffet",
        "international_weekend": "INCAS-Teilnehmende bei einem Tagesausflug",
        "cafe_lingua": "Studierende im Gespräch beim Café Lingua",
        "incas_active": "INCAS-Studierende bei einer gemeinsamen Aktivität",
        "country_evening": "Studierende präsentieren Musik und Kultur bei einem Länderabend",
        "international_tuesday": "Studierende bei einer INCAS-Dienstagsveranstaltung",
        "language_tandem": "Zwei Studierende üben gemeinsam Sprachen",
    },
}

for _locale, _localized_pages in SITE_PAGES.items():
    for _key, _page in _localized_pages.items():
        if _key in _ABOUT_PAGE_KEYS:
            _page["section"] = "about"
        elif _key in _OFFER_PAGE_KEYS:
            _page["section"] = "offers"
        elif _key in _LEGAL_PAGE_KEYS:
            _page["section"] = "legal"
        else:
            raise RuntimeError(f"Content page {_key!r} has no section")
        _image = _page.get("image")
        _width, _height = _IMAGE_DIMENSIONS.get(_image, (None, None))
        _page["image_alt"] = _IMAGE_ALT.get(_locale, {}).get(_key, "")
        _page["image_width"] = _width
        _page["image_height"] = _height
        _page["image_aspect_ratio"] = f"{_width} / {_height}" if _width and _height else None
        _page["image_object_position"] = "center"
        _page["image_priority"] = bool(_image)


def get_site_page(page_key, locale):
    locale_pages = SITE_PAGES.get(locale, {})
    if page_key in locale_pages:
        return locale_pages[page_key]
    return SITE_PAGES["en"][page_key]
