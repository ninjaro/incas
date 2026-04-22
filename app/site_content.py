SITE_UI = {
    "en": {
        "nav.home": "Home",
        "nav.calendar": "Calendar",
        "nav.about": "About",
        "nav.about_us": "About us",
        "nav.working_groups": "Working Groups",
        "nav.team_meetings": "Team Meetings",
        "nav.contacts": "Contacts",
        "nav.forms": "Offers",
        "nav.forms_all": "All forms",
        "nav.language_tandem": "Language Tandem",
        "nav.suggest_event": "Suggest an Event",
        "nav.contact_questions": "Contact / Questions",
        "nav.admin": "Admin",
    },
    "de": {
        "nav.home": "Start",
        "nav.calendar": "Kalender",
        "nav.about": "Über uns",
        "nav.about_us": "Über uns",
        "nav.working_groups": "Arbeitsgruppen",
        "nav.team_meetings": "Teamtreffen",
        "nav.contacts": "Kontakt",
        "nav.forms": "Angebote",
        "nav.forms_all": "Alle Formulare",
        "nav.language_tandem": "Sprachtandem",
        "nav.suggest_event": "Event vorschlagen",
        "nav.contact_questions": "Kontakt / Fragen",
        "nav.admin": "Admin",
    },
}

SITE_OFFERS = {
    "en": {
        "title": "Offers",
        "subtitle": "Information pages first, forms below.",
        "pages": [
            {
                "title": "International Tuesday",
                "url": "/offers/international-tuesday",
            },
            {
                "title": "International Breakfast",
                "url": "/offers/international-breakfast",
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
                "title": "Internationaler Dienstag",
                "url": "/offers/international-tuesday",
            },
            {
                "title": "Internationales Frühstück",
                "url": "/offers/international-breakfast",
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
            <p class="mb-0">This work group is responsible for the organization and the execution of our weekly Tuesday Evening. It prepares the country evenings and special activities, i.e. Pub Quiz, music evenings and barbecues. Furthermore, this group organizes the monthly Café Lingua, which takes place every second Tuesday each month. Café Lingua is a language café, where we offer at least four different language tables, where people can sit together and improve their language skills.</p>
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
            <p class="mb-0">Each last Sunday of the month we prepare for you an international breakfast in Humboldt-Haus. The work group International Breakfast is responsible for the preparation, organisation and the registration process. Shopping, cutting vegetables and fruits as well as brewing coffee belong also to their responsibilities like having a lot of fun and a nice morning with guests from all around the world.</p>
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
        "offers": {
            "title": "Offers",
            "image": None,
            "body_html": """
<section class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
    <p class="lead mb-2">Discover our regular activities and participation options.</p>
    <p class="mb-0 text-body-secondary">Choose an offer from the menu.</p>
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
        <p class="mb-0">The "International Tuesday" is a weekly event where you can get in contact with many students from numerous countries in a relaxed atmosphere. You can play games and spend a beautiful evening together. Inexpensive warm and cold beverages are also available here.</p>
    </div>

    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <h3 class="h5 mb-2">When and where does it take place?</h3>
        <p class="mb-1"><strong class="text-primary-emphasis">Every Tuesday from 8 pm till midnight</strong></p>
        <p class="mb-0">Humboldt-Haus, Pontstraße 41</p>
    </div>

    <div>
        <h2 class="h4 text-body-emphasis">Regular Program</h2>
        <p>Related to the International Tuesday, we offer you a special program:</p>
        <ul class="list-group list-group-flush border rounded-2 overflow-hidden">
            <li class="list-group-item">Country Evening</li>
            <li class="list-group-item"><a class="link-primary" href="https://web.archive.org/web/20210820203001/https://www.incas.rwth-aachen.de/newsite/index.php/en/31-english-contents/main-pages/53-cafe-lingua-en" target="_blank" rel="noopener">Café Lingua</a></li>
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
        <p>In summer, when the weather is good, we often organize barbecues. The INCAS team prepares different salads, bread and snacks for free. You can bring your favourite meat or sausages. Join our barbecue every Tuesday at 8 pm.</p>
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
        <p>Especially for those among you interested in the French culture and language the French-German Cultural Institute offers a variety of classes and other programmes in French and German. You can find the homepage with <a class="link-primary" title="Institut Francais Homepage" href="https://www.institutfrancais.de/aachen" target="_blank" rel="noopener">this link</a>.</p>
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
            <p class="mb-0">Das Team des Internationalen Dienstags ist für die Organisation und Durchführung unseres wöchentlichen Dienstagabends verantwortlich. Hier gilt es, Länderabende vorzubereiten und besondere Aktivitäten zu planen, wie z.B. das Pub Quiz, Musikabende oder Grillabende. Außerdem kümmert sich das Team um die monatliche Organisation des Café Lingua, unser Sprachcafé, wo verschiedene Sprachtische zu mindestens vier Sprachen angeboten werden und unsere Gäste ihre Sprachkenntnisse trainieren können.</p>
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
            <p class="mb-0">Immer am letzten Sonntag im Monat organisieren wir ein gemeinsames Frühstück im Humboldt-Haus. Die Arbeitsgruppe Internationales Frühstück ist zuständig für die Vorbereitung des Frühstücks, die Organisation des Anmeldeprozesses und die Durchführung am jeweiligen Sonntag. Einkaufen, Gemüse schnibbeln und Kaffee kochen gehören genauso dazu, wie jede Menge Spaß und ein toller Vormittag mit Gästen aus der ganzen Welt.</p>
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
        "offers": {
            "title": "Angebote",
            "image": None,
            "body_html": """
<section class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
    <p class="lead mb-2">Hier findest du unsere regelmäßigen Angebote und Mitmachmöglichkeiten.</p>
    <p class="mb-0 text-body-secondary">Wähle oben im Menü ein Angebot aus.</p>
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
        <p class="mb-0">Der Internationale Dienstag ist ein wöchentliches Treffen, bei dem man in gemütlicher Atmosphäre neue Studierende und Nicht-Studierende aus aller Welt z. B. mit Spielen kennenlernen und gemeinsam einen schönen Abend verbringen kann. Es gibt preiswerte warme und kalte Getränke.</p>
    </div>

    <div class="p-4 border-start border-4 border-primary bg-body-tertiary rounded-2">
        <h3 class="h5 mb-2">Wann und wo findet er statt?</h3>
        <p class="mb-1"><strong class="text-primary-emphasis">Jeden Dienstag ab 20:00 bis ca. 24:00 Uhr</strong></p>
        <p class="mb-0">Humboldt-Haus, Pontstraße 41</p>
    </div>

    <div>
        <h2 class="h4 text-body-emphasis">Regelmäßiges Programm</h2>
        <p>Im Rahmen des Internationalen Dienstag bieten wir immer wieder besondere Veranstaltungen an:</p>
        <ul class="list-group list-group-flush border rounded-2 overflow-hidden">
            <li class="list-group-item">Länderabend</li>
            <li class="list-group-item"><a class="link-primary" href="https://web.archive.org/web/20210820210432/https://www.incas.rwth-aachen.de/newsite/index.php/de/31-english-contents/main-pages/49-cafe-lingua" target="_blank" rel="noopener">Café Lingua</a></li>
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
    },
}


def get_site_page(page_key, locale):
    locale_pages = SITE_PAGES.get(locale, {})
    if page_key in locale_pages:
        return locale_pages[page_key]
    return SITE_PAGES["en"][page_key]
