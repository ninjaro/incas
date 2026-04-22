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
<p>
    <span style="color: #000000;">INCAS stands for&nbsp;<span style="color: #ff6600;"><strong>IN</strong></span>tercultural&nbsp;<span style="color: #ff6600;"><strong>C</strong></span>entre of&nbsp;<span style="color: #ff6600;"><strong>A</strong></span>achen&nbsp;<span style="color: #ff6600;"><strong>S</strong></span>tudents. We are a student organisation, which is financially and logistically supported by the International Office of RWTH Aachen and FH Aachen. INCAS mainly serves international students studying at universities, doing an internship or taking a German class in Aachen.</span>
</p>
<p>
    <span style="color: #000000;">The INCAS international team consists of foreign and German students. Our goal is to develop a cultural bridge between students from all countries by promoting their integration and the intercultural communication among them. We support foreign students to make their stay in Aachen as pleasant as possible by providing the help and information they require.</span>
</p>
""".strip(),
        },
        "working_groups": {
            "title": "Working Groups",
            "image": None,
            "body_html": """
<article>
    <p class="art-postheadericons art-metadata-icons">
        <span style="font-size: 16px;">The tasks in INCAS are organized in different work groups. Each group has at least one leader, who is responsible for the activities of the group. The work groups evaluate their progress and plan and discuss future projects mostly independently. This is where you can contribute with your personal ideas and experiences just according to the amount of time you are ready to invest.</span>
    </p>
</article>
<div class="art-postcontent clearfix">
    <div class="art-article">
        <article>
            <p>
                <span style="font-size: 16px;">Our team consists of the following work groups:</span></p>
        </article>
        <p>
            <span style="color: #e67e23;"><strong>Coordination</strong></span>
        </p>
        <p>
            Two students of our team are responsible for the leadership of INCAS. They overview all activities, lead the weekly team meeting and they are the contact person for the group leaders. Furthermore, they represent INCAS outwards.
        </p>
        <p>
            <span style="color: #e67e23;"><strong>International Tuesday and Café Lingua</strong></span>
        </p>
        <p>
            This work group is responsible for the organization and the execution of our weekly Tuesday Evening. It prepares the country evenings and special activities, i.e. Pub Quiz, music evenings and barbecues. Furthermore, this group organizes the monthly Café Lingua, which takes place every second Tuesday each month. Café Lingua is a language Café, where we offer at least for four different language tables, where people can sit together and improve their language skills.
        </p>
        <p>
            <span style="color: #e67e23;"><strong>International Weekend</strong></span>
        </p>
        <p>
            Once a month we organize a day trip to a destination in Germany or to the neighboring countries. The work group "International Weekend" is responsible for finding ideas, planning, organizing and accompanying the participants during the day of the trip. An extensive preparation and follow-up of each excursion needs to be provided by the team, i.e. the organization of the program for the whole day, the advertisement, the registration process, the financial calculation and later the evaluation of the trip. International guests, interesting cities and a varying program make every excursion a special experience.
        </p>
        <p>
            <span style="color: #e67e23;"><strong>Accommodation Search and Service hours</strong></span><strong><br></strong>
        </p>
        <p>
            Searching for an accommodation in a new city and being confronted with the problem not to master the language is a big challenge for every international student. The work group Apartment Search is always on hand with help and advice. On the other hand, "Service Hours" are offered several times a week. During these hours feel free to come to our office in Humboldt-Haus and tell us your questions concerning hiring contracts, university issues, or other student problems. Our "Service Hours" take place in several languages.
        </p>
        <p>
            <span style="color: #e67e23;"><strong>Language Exchange</strong></span>
        </p>
        <p>
            You might know this problem: You are visiting one language course after the other, but you are not able to hold talks yet. As a result, INCAS team decided to establish a database, where we collect information about the people who are interested in doing a tandem and we bring them together. The work group "Language exchange" is also open to give you hints how to organise a tandem effectively and at the same time with a lot of fun. Afterwards, it is your turn: You meet your tandem partner wherever you want and how often you want- with a little luck you will find a new friend, improve your target language and learn more about the cultural background of your tandem partner.
        </p>
        <p>
            <span style="color: #e67e23;"><strong>International Breakfast</strong></span>
        </p>
        <p>
            Each last Sunday of the month we prepare for you an international breakfast in Humboldt-Haus. The work group International Breakfast is responsible for the preparation, organisation and the registration process. Shopping, cutting vegetables and fruits as well as brewing coffee belong also to their responsibilities like having a lot of fun and a nice morning with guests from all around the world.
        </p>
        <p>
            <span style="color: #e67e23;"><strong>Public Relations</strong></span>
        </p>
        <p>
            To keep you up to date about the events INCAS is organizing for you and to get in touch with new students there is one responsible for public relations.<br>The work includes the maintenance of the website, facebook page, designing flyers and all other that is related to the public appearance of INCAS.
        </p>
        <p>
            <span style="color: #e67e23;"><strong>Incas Active</strong></span>
        </p>
        <p>
            Beside our regular program, we always try to offer some special activities for our guests. Therefore, we go together to the climbing forest, do ice-skating or play soccer together. INCAS Active cares about the ideas, organization and enrollment of the activities. Here you are always free to tell us your ideas and suggestions for the next event and organize it with us.
        </p>
    </div>
</div>
""".strip(),
        },
        "team_meetings": {
            "title": "Team Meetings",
            "image": "img/site/team-meetings.webp",
            "body_html": """

<p>
    We meet once a week with the active team members from INCAS in order to exchange relevant information and determine the progress of all work groups. If you are interested in joining our team, just come to one of our regular meetings where you can find out more about who we are and what exactly we are doing.
</p>
<p>
    The weekly meeting of the INCAS team takes place every&nbsp;<strong><span style="color: #ff6600;">Tuesday at 7:00 p.m.</span></strong>&nbsp;in the&nbsp;<strong>INCAS office at Humboldt-Haus</strong>&nbsp;and is open to everyone. If you have any questions about the team meeting do not hesitate to&nbsp;contact us.
</p>
""".strip(),
        },"offers": {
            "title": "Offers",
            "image": None,
            "body_html": """
        <p>Discover our regular activities and participation options.</p>
        <p>Choose an offer from the menu.</p>
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
<p>
    Our&nbsp;<strong>International&nbsp;Breakfast</strong> is a monthly buffet which lets you have a relaxed and fun start into the day while meeting new people from all over the world. It usually takes place on a monthly basis on a Saturday.
</p>
<p>
    Depending on the event we may serve dishes from foreign countries, or sometimes even Germany. Past events from this year include Turskish and Peruvian breakfasts.&nbsp;
</p>
<p>
    For exact dates, registration and more detailed information you can check out the website, <a title="Facebook Website INCAS Aachen" href="https://www.facebook.com/INCASAachen/" target="_blank" rel="noopener">Facebook</a>, <a title="INCAS Instagram Page" href="https://www.instagram.com/incas_aachen/" target="_blank" rel="noopener">Instagram</a> or ask us on the International Tuesday events.
</p>
<p>
    We're looking forward to seeing you.
</p>
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
<h2>The world is waiting for you!</h2>
<p>The "Internationaler Dienstag" department is basically the main crew behind the events that take place on Tuesdays at Humboldt-House, which means they're the members that take responsibility for planning and implementing the events and also making sure that Humboldt-House stays in tip-top-shape after each event.</p>
<p>The "International Tuesday" is a weekly event where you can get in contact with many students from numerous countries in a nice and easy-going atmosphere. You can play games and spend a beautiful evening together. Inexpensive warm and cold beverages are also available here.</p>
<p><strong>When and where does it take place?</strong></p>
<p>Every Tuesday from 8 pm till midnight</p>
<p>in&nbsp;Humboldt-Haus, Pontstraße 41</p>
<hr>
<p>...related to the "Internationaler Dienstag", we offer you a special program:</p>
<ul>
<li><a href="/site/en/offers/country-evening" hreflang="en">Country Evening</a></li>
<li><a href="https://web.archive.org/web/20210820203001/https://www.incas.rwth-aachen.de/newsite/index.php/en/31-english-contents/main-pages/53-cafe-lingua-en">Café Lingua</a></li>
<li>Barbecues in Summer</li>
<li>Music Nights</li>
<li>Easter Celebrations</li>
<li>Christmas Celebrations</li>
<li>Pub Quiz</li>
<li>and more...</li>
</ul>
<p>You can receive the current information about upcoming events simply check our <a href="/site/en/events">Event</a> calendar.</p>
<p>The INCAS team and Aachen's international community cannot wait to meet you! See you next Tuesday!</p>
<div>&nbsp;<hr></div>
<h2>Country Nights</h2>
<p>You are very welcome to give a presentation about your country. You can choose the topics you want to talk about, no matter whether it is cultural information, geographical aspects, the economy, your national sport, an interesting movie, a dance or some of each! Of course we will also support you during the preparation in case you need any help from us. The language used should be either English or German. Share with us impressions from your country!</p>
<h2>Barbecue</h2>
<p>In summer, when the weather is good, we often organize barbecues. The INCAS team prepares different salads, bread and snacks for free. You can bring your favourite meat or sausages. Join our barbecue every Tuesday at 8 pm.</p>
<h2>Music Night</h2>
<p>Can you sing or play an instrument? Do you play in a band? We are excited to hear your voice and your music.</p>
<h2>Special Celebrations</h2>
<p>How do people celebrate Easter and Christmas in Germany? Join us in our events to celebrate together so that you learn about special German or local traditions. We will paint easter eggs, cook traditional German food together, bake cake, or sing typical Christmas songs. And much more. Just come and let us surprise you!</p>
<h2>You have your own idea?</h2>
<p>Do you have further ideas or questions regarding our "International Tuesday"? Just <a href="/site/en/contact?view=contact&amp;id=2:koordination&amp;catid=4">contact</a> us.</p>
<p>We are looking forward to hearing from you,<br>your INCAS Team</p>
""".strip(),
        },
        "language_tandem": {
            "title": " Language Tandem",
            "image": "img/site/language-tandem.webp",
            "form": {
                "type": "language_tandem",
            },
            "body_html": """
<h2>In a language tandem or 'Sprachtandem' partnership...</h2>
<p>Learning a language just from books is not only boring, but it will never achieve the desired result. What really helps is active talking. If you are looking for a suitable tandem partner to have actual conversations in a certain language, we can help you to find a someone. That way you can practice together and learn from each other while having much more fun.</p>
<p>To <strong>register for the Sprachtandem</strong>, just click on this link: <a href="/site/../sprachtandem/tandem_form.php" target="_blank" rel="noopener" hreflang="en">Sprachtandem Form</a><a href="https://web.archive.org/web/20210820210854/https://www.incas.rwth-aachen.de/newsite/index.php/en/?id=58:sprachtandem-form&amp;catid=29"><br></a></p>
<p>More than <strong>300 </strong>participants are matched each year!</p>
<h2>...or speak with many people.</h2>
<p>The <a href="/site/en/allcategories-en-gb/uncategorised/cafe-lingua" rel="noopener" hreflang="en">Café Lingua</a>&nbsp;is an international, multilingual café, where you can sit together, have a coffee, tea or beer while practicing the languages you like. Here people interested in languages come together.</p>
<p>&nbsp;</p>
<h2>Other possibilities</h2>
<p>Especially for those among you interested in the French culture and language the French-German Cultural Institute offers a variety of classes and other programmes in French and German. You can find the homepage with <a title="Institut Francais Homepage" href="https://www.institutfrancais.de/aachen" target="_blank" rel="noopener">this link</a>.</p>
<p>&nbsp;</p>
<h2><strong>What exactly is a "Sprachtandem" </strong><strong>(language partner)?</strong></h2>
<p>The idea is to bring two persons with different native languages together so that they can learn from each other.</p>
<p>It entirely depends on you how you plan your meetings. You can either do some grammar or you can simply have interesting discussions with your partner about films, books or your activities during the last weekend. At the same time you will be able to extend your cultural horizon and to get in touch with nice people.</p>
<p>Here you can apply your knowledge acquired in classroom lessons in real life.</p>
<hr>
<h2>How does this whole thing actually work?</h2>
<h4><strong>Step 1: Registration</strong></h4>
<p>If you are looking for a language exchange partner, you will first of all have to fill in the <strong><a href="/site/../sprachtandem/tandem_form.php" target="_blank" rel="noopener">Sprachtandem Form.</a></strong></p>
<p>Please take care to only check those languages you feel confident teaching, respectively those you want to learn. You can mention your other languages in the comments section. This allows us to assign you the right tandem.</p>
<h4><strong>Step 2: How INCAS finds a language exchange partner for you</strong></h4>
<p>As soon as we find a partner for you, we will send you his/her information. It will be up to you to get in touch with each other.</p>
<h4><strong>Step 3: As soon as you have found a partner</strong></h4>
<p>It is entirely up to you on how you do your language exchange. It might be helpful if you choose an activity that provides you with enough topics to talk about: cooking typical dishes, going out or also just plain grammar studies.</p>
<hr>
<h2>Any Questions?</h2>
<h4>What do you do if the language exchange does not really work?</h4>
<p>In this case, please contact us and we will help you to find a new partner.</p>
<h4>You might think that your language knowledge does not suffice?</h4>
<p>Don't worry, you can still apply and get a partner even though your level of proficiency is not that high. If you are interested in meeting someone from a different country who speaks a different language, e.g. Chinese, then you have the possibility simply get in touch through more of a "cultural exchange".</p>
<h4>You would like to let others know how the Sprachtandem-programme influenced your language learning experience?</h4>
<p>Send us an email! We will publish the most interesting reports in order to give a better overview of the possible varieties of the programme and to encourage more people to start a tandem.</p>
<h2>Contact</h2>
<p>If you have any further questions regarding our language offers just send us an email through our <a href="/site/en/component/contact/contact/sprachtandem-kontakt?catid=4&amp;Itemid=104">Contact</a> site.</p>
<p>We are looking forward to hearing from you,<br>your INCAS Team</p>
""".strip(),
        },
    },
    "de": {
        "about": {
            "title": "Über uns",
            "image": "img/site/about-team.webp",
            "body_html": """
<p>
    <span style="color: #000000;">INCAS steht für&nbsp;<span style="color: #ff6600;"><strong>IN</strong></span>terkulturelles&nbsp;<span style="color: #ff6600;"><strong>C</strong></span>entrum&nbsp;<span style="color: #ff6600;"><strong>A</strong></span>achener&nbsp;<span style="color: #ff6600;"><strong>S</strong></span>tudierender. Wir sind eine studentische Vereinigung, die sich mit Unterstützung des International Office der RWTH Aachen und des Akademischen Auslandsamtes der FH Aachen um die Betreuung internationaler Studierender, Studienkollegiaten, Praktikanten und Deutschkurs-TeilnehmerInnen kümmert. Das internationale Team setzt sich aus ausländischen und deutschen Studierenden zusammen.</span>
</p>
<p>
    <span style="color: #000000;">Das Ziel ist es, den Kontakt und den kulturellen Austausch unter den Studierenden aller Nationen durch Integration und interkulturelle Kommunikation zu verbessern, sowie ihren Aufenthalt in Aachen durch Beratungsangebote und Hilfestellungen zu erleichtern. Finanzielle und logistische Unterstützung erhält das INCAS sowohl durch die RWTH als auch die FH.</span>
</p>
""".strip(),
        },
        "working_groups": {
            "title": "Arbeitsgruppen",
            "image": None,
            "body_html": """
<p>
    Bei INCAS kümmern sich verschiedene Arbeitsgruppen um die einzelnen Aufgaben. Jede Gruppe wird von einem Gruppenleiter geleitet, der für die Aktivitäten in der Gruppe verantwortlich ist. Innerhalb der Arbeitsgruppen werden anstehende Veranstaltungen geplant, zukünftige Aktivitäten diskutiert und bisherige Projekte ausgewertet. Hier hast du die Möglichkeit, mitzuwirken und deine eigenen Ideen und Erfahrungen einzubringen. Dabei ist es dir selbst überlassen, wie stark du dich einbringen magst und wie viel Zeit du hast, dich zu engagieren.
</p>
<p>
    Folgende Arbeitsgruppen gibt es zurzeit bei INCAS:
</p>
<p>
    <span style="color: #e67e23;"><strong>Koordination</strong></span>
</p>
<p>
    Zwei Studierende aus unserem Team sind immer hauptverantwortlich für die Leitung des INCAS. Sie behalten den Überblick über alle Aktivitäten, leiten die wöchentlichen Teamtreffen, stehen den Arbeitsgruppenleitern als Ansprechpartner zur Verfügung und repräsentieren INCAS nach außen.<br><span id="cloakb1a2acef5b09d048a74fa0abb2b1466e"></span>
</p>
<p>
    <span style="color: #e67e23;"><strong>Internationaler Dienstag und Café Lingua</strong></span>
</p>
<p>
    Das Team des Internationalen Dienstags ist für die Organisation und Durchführung unseres wöchentlichen Dienstagabends (Stammtisch) verantwortlich. Hier gilt es, Länderabende vorzubereiten und besondere Aktivitäten zu planen, wie z.B. das Pub Quiz, Musikabende oder Grillabende. Außerdem kümmert sich das Team um die monatliche Organisation des Café Lingua, unser Sprachcafé, wo verschiedene Sprachtische zu mindestens vier Sprachen angeboten werden und unsere Gäste ihre Sprachkenntnisse trainieren können.
</p>
<p>
    <span style="color: #e67e23;"><strong>Internationales Wochenende</strong></span>
</p>
<p>
    Einmal im Monat organisieren wir einen Tagesausflug zu einem Ziel innerhalb Deutschlands oder in die angrenzenden Nachbarländer. Unsere Arbeitsgruppe INCAS Wochenende ist zuständig für die Ideenfindung, Planung, Organisation und Begleitung der Gruppe am Tag des Ausflugs. Eine intensive Vorbereitung und Nachbereitung von jeder Exkursion werden durch das Team gewährleistet. Dazu gehören z.B. die Organisation eines Tagesprogramms, die Werbung für das Event, die Betreuung des Anmeldeprozesses, die finanzielle Kalkulation und später die Evaluation der Fahrt. Internationale Gäste, interessante Städte und ein abwechslungsreiches Programm machen jede Exkursion zu einem ganz besonderen Erlebnis.<span id="cloak96a867cb5baef1da149a3b18b1073485"><br></span>
</p>
<p>
    <strong><span style="color: #e67e23;">Wohnungssuche und Servicezeit</span><br></strong>
</p>
<p>
    Eine Unterkunft in einer neuen Stadt zu finden und dabei häufig noch mit dem Problem konfrontiert zu sein, die Sprache nicht zu beherrschen, ist eine große Herausforderung für jeden internationalen Studierenden. Das Team der Wohnungssuche steht dir mit Rat und Tat zur Seite. Die Servicezeit wird mehrmals die Woche angeboten. In diesen Zeiten könnt ihr in unser Büro im Humboldt-Haus kommen und uns Fragen stellen zu Mietverträgen, universitären Angelegenheiten oder anderen studentischen Problemen. Das Team der Servicezeit steht euch mehrsprachig zur Verfügung und beantwortet während dieser Zeit auch Fragen zur Wohnungssuche.<br><span id="cloak60d3b6fdaee19254a1ed0566a93b842f"></span>
</p>
<p>
    <span style="color: #e67e23;"><strong>Sprachtandem</strong></span>
</p>
<p>
    Das Problem kennst du vielleicht: Du besuchst einen Sprachkurs nach dem anderen, aber richtige Gespräche kannst du trotzdem noch nicht führen. Aus diesem Grund hat sich INCAS entschlossen, eine Datenbank aufzubauen, in der wir Tandemsuchende sammeln und vermitteln. Die Arbeitsgruppe Sprachtandem gibt euch auch gerne Tipps, wie ihr ein Tandem möglichst effektiv gestaltet und gleichzeitig sehr viel Spaß daran haben könnt. Dann seid ihr gefragt: Ihr trefft euch mit eurem Tandempartner wo und so oft ihr wollt- mit ein bisschen Glück findet ihr einen guten Freund, verbessert miteinander eure Zielsprachen und lernt etwas über die Kultur des anderen.<span id="cloak86b6867ce4f43cce099ec24ffc633a3b"><br></span>
</p>
<p>
    <span style="color: #e67e23;"><strong>Internationales Frühstück</strong></span>
</p>
<p>
    Immer am letzten Sonntag im Monat organisieren wir ein gemeinsames Frühstück im Humboldt-Haus. Die Arbeitsgruppe Internationales Frühstück ist zuständig für die Vorbereitung des Frühstücks, die Organisation des Anmeldeprozesses und die Durchführung am jeweiligen Sonntag. Einkaufen, Gemüse schnibbeln und Kaffee kochen gehören genauso dazu, wie jede Menge Spaß und ein toller Vormittag mit Gästen aus der ganzen Welt.
</p>
<p>
    <strong><span style="color: #e67e23;">Öffentlichkeitsarbeit</span><br></strong>
</p>
<p>
    Damit ihr immer auf dem Laufenden bleibt, welche Aktionen wir für Euch planen, und mehr Menschen von INCAS erfahren, übernimmt ein/e Studierende/r die Öffentlichkeitsarbeit.<br>Dazu gehört die Aktualisierung der Website, der Facebookseite, das Design von Flyern und vieles mehr, was mit dem Auftreten von INCAS nach außen zu tun hat.<span id="cloak5a8b7cc4d75cc8cbff692b50fc3192fc"></span>
</p>
<p>
    <strong><span style="color: #e67e23;">Incas Aktiv</span><br></strong>
</p>
<p>
    Neben unserem ständigem Programm versuchen wir immer wieder zusätzliche Aktivitäten für unsere Gäste anzubieten. Dazu zählen z.B. ein Besuch im Kletterwald, gemeinsames Schlittschuhlaufen oder Fußball spielen. INCAS Aktiv kümmert sich um Ideen, Organisation und Betreuung der Events. Hier könnt auch ihr gerne mit Ideen an uns herantreten.<br><span id="cloak0788a8b2d4e2f4861be8f8baa968354e"></span>
</p>
""".strip(),
        },
        "team_meetings": {
            "title": "Teamtreffen",
            "image": "img/site/team-meetings.webp",
            "body_html": """
<p style="text-align: left;">
    Einmal in der Woche treffen sich die aktiven INCAS Mitglieder, um sich auszutauschen, über die Aufgaben der Arbeitsgruppen zu berichten und neue Events zu planen. Wenn du Lust hast, bei INCAS mitzumachen und Teil unseres Teams zu werden, komm einfach bei unserem wöchentlichen Teamtreffen vorbei und du kannst mehr über unsere Arbeit und das Team erfahren.
</p>
<p style="text-align: left;">
    Unser Teamtreffen findet jeden&nbsp;<strong><span style="color: #ff6600;">Dienstag um 19:00 Uhr</span></strong>&nbsp;im<strong>&nbsp;INCAS Büro im Humboldt-Haus</strong> statt. Solltest du vorab Fragen zu unserer Arbeit oder unserem Teamtreffen haben, schreib uns einfach eine E-Mail.&nbsp;
</p>
""".strip(),
        },"offers": {
            "title": "Angebote",
            "image": None,
            "body_html": """
        <p>Hier findest du unsere regelmäßigen Angebote und Mitmachmöglichkeiten.</p>
        <p>Wähle oben im Menü ein Angebot aus.</p>
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
<p>
    Unser&nbsp;<strong>Internationales Frühstück</strong>&nbsp;ist ein monatlich stattfindendes Büffet,&nbsp;das dir einen entspannten und fröhlichen Start in den Tag erlaubt. Gleichzeitig hast du die Möglichkeit neue Menschen aus aller Welt zu treffen. Die Veranstaltung findet&nbsp;<strong>normalerweise an einem Samstag </strong>statt.&nbsp;
</p>
<p>
    Gegen eine kleine Aufwandsentschädigung kannst du so viel essen wie du magst oder so lange noch etwas da ist ;) Je nach Veranstaltung bieten wir Spezialitäten aus anderen Ländern oder ein eher typisch deutsches Frühstück mit, z.B., frischen Brötchen, Butter, Käse und Aufschnitt, Müsli, Jogurth, Obst, Saft, Kaffee und Tee.
</p>
<p>
    Für genaue Informationen schau auf dieser Website, <a title="Facebook Website INCAS Aachen" href="https://www.facebook.com/INCASAachen/" target="_blank" rel="noopener">Facebook</a> oder <a title="INCAS Instagram Page" href="https://www.instagram.com/incas_aachen/" target="_blank" rel="noopener">Instagram</a> oder frag uns einfach bei einem Internationalen Dienstag.
</p>
<p>
    Wir freuen uns auf dich!
</p>
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
<h2>Die Welt wartet auf dich!</h2>
<p>
    Die Abteilung "Internationaler Dienstag" ist im Grunde genommen die Hauptcrew hinter den Veranstaltungen, die Dienstags im Humboldt-Haus stattfinden, d. h. sie sind die Mitglieder, die für die Planung und Durchführung der Veranstaltungen verantwortlich sind und auch dafür sorgen, dass das Humboldt-Haus nach jeder Veranstaltung in einem tadellosen Zustand ist.
</p>
<p>
    Der „Internationale Dienstag“ ist ein wöchentliches Treffen, bei dem man in gemütlicher Atmosphäre neue Studierende und Nicht-Studierende aus aller Welt z. B. mit Spielen kennenlernen und gemeinsam einen schönen Abend verbringen kann. Es gibt preiswerte warme und kalte Getränke.
</p>
<div class="ce_text block">
    <p>
        <strong>Wann und wo findet er statt?</strong>
    </p>
    <p>
        Jeden&nbsp;<strong>Dienstag ab 20:00&nbsp;bis ca. 24:00 Uhr</strong><br>im&nbsp;Humboldt-Haus, Pontstraße 41
    </p>
    <hr>
    <p>
        ... im Rahmen des „Internationalen Dienstag“ immer wieder besondere Veranstaltungen an:
    </p>
    <ul>
        <li>Länderabend</li>
        <li><a href="https://web.archive.org/web/20210820210432/https://www.incas.rwth-aachen.de/newsite/index.php/de/31-english-contents/main-pages/49-cafe-lingua">Café Lingua</a></li>
        <li>Grillabende im Sommer</li>
        <li>Musikabende</li>
        <li>Osterfeier</li>
        <li>Weihnachtsfeier</li>
        <li>Und vieles mehr...</li>
    </ul>
    <p>
        Die aktuellen Informationen über unsere Veranstaltungen erhältst du wenn du in unseren <a href="/site/de/veranstaltungen">Event</a> Kalender schaust.
    </p>
    <p>
        Das INCAS–Team und unsere deutschen und ausländischen Gäste freuen sich darauf, dich kennen zu lernen!
    </p>
    <p>&nbsp;</p>
    <hr>
    <p>Länderabende</p>
    <p>
        Würdet ihr uns gerne euer Herkunftsland vorstellen? Kein Problem! Bei uns habt ihr die Möglichkeit! Wir stellen euch gerne einen Laptop und einen Beamer zur Verfügung! Wollt ihr uns auch noch einige leckere Gerichte aus eurem Land präsentieren? Toll! Wir unterstützen euch dabei gerne mit unserer Hilfe und auch finanziell! Sprecht uns einfach an! Wir sind für eure Vorschläge offen!
    </p>
    <h2>Grillabende</h2>
    <p>
        Im Sommer bei schönem Wetter grillen wir zusammen. Wir, als INCAS – Team, stellen euch verschiedene Salate, Brot und Kleinigkeiten kostenlos zur Verfügung. Außerdem machen wir einen Grill fertig, auf dem ihr euer mitgebrachtes Fleisch oder Würstchen grillen könnt.
    </p>
    <h2>Musikabende</h2>
    <p>
        Könnt ihr singen oder habt ihr Lust Stücke auf einem Instrument zu spielen? Dann seid ihr bei uns herzlich willkommen! Wir und eure Freunde bei INCAS werden uns sehr freuen, eure Kunststücke zu hören oder zu sehen!
    </p>
    <h2>Besondere Feiertage</h2>
    <p>
        Wie feiert man eigentlich Ostern und Weihnachten in Deutschland? Kennt ihr die Traditionen? Kennt ihr die Unterschiede zu eurem Land? Dann kommt einfach bei uns vorbei! Wir feiern mit euch und zeigen euch wie schön es hier sein kann! Wir bemalen mit euch Ostereier, kochen zusammen leckere Speisen, backen Plätzchen und singen Weihnachtslieder! Und noch viel mehr! Lasst euch überraschen!
    </p>
    <h2>Du hast noch eigene Ideen?</h2>
    <p>
        Ihr habt noch weitere Ideen oder Fragen zum Internationalen Dienstag? Kontaktiert uns einfach.
    </p>
    <p>Wir freuen uns über eure Rückmeldungen,<br>das INCAS Team</p>
</div>
""".strip(),
        },
        "language_tandem": {
            "title": "Sprachtandem",
            "image": "img/site/language-tandem.webp",
            "form": {
                "type": "language_tandem",
            },
            "body_html": """
<h2>Zu zweit, in kleinen Gruppen ...</h2>
<p>Eine Sprache nur aus Büchern zu erlernen, ist nicht nur langweilig, sondern führt auch nie zum gewünschten Erfolg. Was wirklich hilft, ist reden. Bei der Suche nach einem passenden Partner für deine Wunschsprache hilft dir das Sprachtandem Angebot&nbsp;von INCAS weiter.</p>
<p>Um dich für das Sprachtandem zu registrieren, fülle einfach das <a href="/site/../sprachtandem/tandem_form.php" target="_blank" rel="noopener">Sprachtandem Formular</a>&nbsp;aus.</p>
<p>Seit dem 01. Oktober 2013 wurden mehr als <strong>690 </strong>Teilnehmer vermittelt.</p>
<h2>... oder mit ganz vielen</h2>
<p>Das <a href="/site/de/angebote/cafe-lingua" hreflang="de">Café Lingua</a><a href="https://web.archive.org/web/20210820221551/https://www.incas.rwth-aachen.de/newsite/index.php/de/31-english-contents/main-pages/49-cafe-lingua"> </a>ist das internationale Sprachcafé beim INCAS. Hier kommen interessierte Studierende an Sprachtischen zusammen und unterhalten sich über alles, was ihnen so einfällt.</p>
<p>Ist deine Sprache noch nicht dabei, kannst Du einen Stammtisch ins Leben rufen, schreibe mir dazu einfach eine E-Mail und wir besprechen das weitere Vorgehen.</p>
<h2>Was ist ein Sprachtandem?</h2>
<p>Die grundlegende Idee ist, zwei Menschen unterschiedlicher Muttersprachen miteinander in Kontakt zu bringen, so dass sie die Sprache des jeweils anderen lernen.</p>
<p>Wie ihr eure Treffen gestaltet, bleibt vollkommen euch überlassen. Ihr könnt Grammatik pauken, oder über Filme, Bücher und das letzte Wochenende diskutieren. Und ganz nebenbei habt ihr die Möglichkeit, euren kulturellen Erfahrungsschatz zu erweitern und interessante Kontakte zu knüpfen.</p>
<p>Hier habt ihr die Möglichkeit, das, was ihr im Unterricht gelernt habt, kostenlos und realitätsnah anzuwenden und zu verbessern!</p>
<hr>
<h2>Wie läuft das Ganze ab?</h2>
<h4>1.) Die Anmeldung</h4>
<p>Wenn ihr einen Sprachtandempartner sucht, müsst ihr zunächst das <strong><a href="/site/../sprachtandem/tandem_form.php" target="_blank" rel="noopener">Sprachtandemformular</a>&nbsp;&nbsp;</strong>ausfüllen.&nbsp;</p>
<p>Bitte beachtet dabei, nur die Sprachen anzuklicken, die ihr unterrichten könnt und lernen möchtet. Weitere Sprachen könnt ihr gerne im Kommentarfeld angeben! So ist sichergestellt, dass wir euch auch das richtige Tandem vermitteln.</p>
<h4>2.) Wie euch INCAS eine/n Partner/in vermittelt...</h4>
<p>Sobald wir eine/n Partner/in gefunden haben, schicken wir euch seinen/ihren Kontakt. Es bleibt dann euch überlassen den Kontakt zu ihm/ihr aufzunehmen.</p>
<h4><strong>3.) Wenn du eine/n Sprachtandem-Partner/in hast</strong></h4>
<p>Wie ihr das Tandem gestaltet, ist eure Sache. Hilfreich ist, wenn ihr euch bei euren Treffen Beschäftigungen sucht, die Gesprächsstoff liefern, wie z.B. typische Gerichte kochen, Ausgehen oder richtig Lernen. Eurer Kreativität sind keine Grenzen gesetzt.&nbsp;</p>
<hr>
<h2>Noch Fragen?</h2>
<h4>Was tust du, wenn das Tandem nicht so recht funktioniert?</h4>
<p>Schreibe uns eine E-Mail und wir werden dir eine/n neue/n Partner/in suchen.</p>
<h4>Du befürchtest, dass deine Sprachkenntnisse für ein Sprachtandem ungenügend sind?</h4>
<p>Bewirb dich trotzdem, in der Regel findet sich auch bei geringen Sprachkenntnissen ein Partner. Falls du Interesse hast, einen Studierenden aus einem Land kennen zu lernen, dessen Sprache du nicht beherrschst, z.B. Chinesisch, dann besteht auch die Möglichkeit der Vermittlung eines „Kulturellen Austausches“.</p>
<p><strong>Du möchtest anderen davon berichten, wie das Sprachtandem deinen Sprachlernprozess beeinflusst hat?</strong></p>
<p>Schreibe uns von deinen Erfahrungen! Die schönsten Berichte veröffentlichen wir dann auf unserer Homepage um einen besseren Eindruck von der möglichen Vielfalt des Sprachtandems zu vermitteln.</p>
<h2>Kontakt</h2>
<p>Wenn du noch Fragen oder Vorschläge zu unseren Sprachangeboten hast, dann schreibe uns einfach eine Email über die <a href="/site/de/component/contact/contact/sprachtandem-kontakt?catid=4&amp;Itemid=105" rel="noopener">Kontakt</a> Seite.</p>
<p>Wir freuen uns über deine Rückmeldungen,<br>dein INCAS Team</p>
""".strip(),
        },
    },
}


def get_site_page(page_key, locale):
    locale_pages = SITE_PAGES.get(locale, {})
    if page_key in locale_pages:
        return locale_pages[page_key]
    return SITE_PAGES["en"][page_key]
