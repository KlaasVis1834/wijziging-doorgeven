// Toon/verberg velden op basis van wijziging-type
function toggleFields() {
    const wijzigingType = document.getElementById('wijziging-type').value;
    console.log("Gekozen wijziging-type:", wijzigingType);
    const fieldGroups = {
        'adreswijziging': ['adreswijziging-fields-postcode', 'adreswijziging-fields-huisnummer', 'adreswijziging-fields-adres', 'adreswijziging-fields-datum'],
        'motorvoertuigwijziging': ['motorvoertuigwijziging-fields-datum', 'motorvoertuigwijziging-fields-polisnummer', 'motorvoertuigwijziging-fields-huidig-kenteken', 'motorvoertuigwijziging-fields-huidig-merk', 'motorvoertuigwijziging-fields-huidig-model', 'motorvoertuigwijziging-fields-nieuw-kenteken', 'motorvoertuigwijziging-fields-nieuw-merk', 'motorvoertuigwijziging-fields-nieuw-model'],
        'verzekering-beëindigen': ['verzekering-beëindigen-fields-datum', 'verzekering-beëindigen-fields-reden'],
        'terugbelverzoek': ['terugbelverzoek-fields-telefoon', 'terugbelverzoek-fields-datum', 'terugbelverzoek-fields-tijd'],
        'emailwijziging': ['emailwijziging-fields-huidig', 'emailwijziging-fields-nieuw'],
        'anders': ['anders-fields']
    };

    Object.values(fieldGroups).flat().forEach(id => {
        const element = document.getElementById(id);
        if (element) element.classList.add('hidden');
    });

    if (fieldGroups[wijzigingType]) {
        fieldGroups[wijzigingType].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.classList.remove('hidden');
        });
    }
}

// Postcode API voor adreswijziging
async function fetchPostcodeData() {
    const postcode = document.getElementById('nieuwe-postcode').value.replace(/\s/g, '');
    const huisnummer = document.getElementById('nieuwe-huisnummer').value;
    const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?q=${postcode} ${huisnummer}&rows=1`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        const adres = data.response.docs[0];
        document.getElementById('nieuw-adres').value = `${adres.straatnaam} ${huisnummer}, ${adres.woonplaatsnaam}`;
    } catch (error) {
        console.error('Fout bij ophalen postcodegegevens:', error);
        document.getElementById('nieuw-adres').value = '';
    }
}

// RDW API voor motorvoertuigwijziging
async function fetchRDWData(kentekenField, merkField, modelField) {
    const kenteken = document.getElementById(kentekenField).value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const url = `https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken=${kenteken}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.length > 0) {
            const auto = data[0];
            document.getElementById(merkField).value = auto.merk;
            document.getElementById(modelField).value = auto.handelsbenaming;
        } else {
            alert('Geen voertuig gevonden met dit kenteken.');
        }
    } catch (error) {
        alert('Fout bij ophalen RDW-gegevens: ' + error.message);
    }
}

// Kalender logica voor openingsdagen
function disableNonWorkingDays() {
    const dateInput = document.getElementById('voorkeur-datum');
    if (!dateInput) return;

    const holidays2025 = [
        '2025-01-01','2025-04-18','2025-04-21','2025-04-27','2025-05-05','2025-05-29','2025-06-09','2025-12-25','2025-12-26'
    ];

    dateInput.addEventListener('input', function() {
        const selectedDate = new Date(this.value);
        const dayOfWeek = selectedDate.getDay();
        const dateString = this.value;

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            alert('Kies een werkdag (maandag t/m vrijdag).');
            this.value = '';
            return;
        }
        if (holidays2025.includes(dateString)) {
            alert('Deze datum is een nationale feestdag. Kies een andere werkdag.');
            this.value = '';
        }
    });

    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
}

// Formulier verzenden met reCAPTCHA check
document.getElementById('wijziging-form').addEventListener('submit', function(event) {
    event.preventDefault();

    // Controleer reCAPTCHA
    const recaptchaResponse = grecaptcha.getResponse();
    if (!recaptchaResponse) {
        alert('Vink de reCAPTCHA aan voordat u verzendt.');
        return;
    }

    const form = this;
    const formData = new FormData(form);
    let email = formData.get('email') || 'rbuijs@klaasvis.nl';
    let voorletters = formData.get('voorletters') || '';
    let achternaam = formData.get('achternaam') || '';
    let emailBody = `Beste ${voorletters} ${achternaam},\n\nHartelijk dank voor het doorgeven van uw wijziging bij Klaas Vis Assurantiekantoor. Wij hebben uw aanvraag ontvangen en verwerken deze zo spoedig mogelijk.\n\nHieronder vindt u een overzicht van de door u ingevulde gegevens:\n`;

for (let [key, value] of formData.entries()) {
    // reCAPTCHA-veld niet meesturen
    if (key === 'g-recaptcha-response') continue;

    if (value && value.trim() !== '') {
        emailBody += `${key}: ${value}\n`;
    }
        }
    }

    emailBody += `\nHeeft u in de tussentijd vragen? U kunt ons bereiken via:\n- E-mail: info@klaasvis.nl\n- Telefoon: 075 – 631 42 61 (werkdagen 09:00-16:00)\n\nMet vriendelijke groet,\nTeam Klaas Vis Assurantiekantoor\nZuiderweg 7, 1456 NC Wijdewormer\nwww.klaasvis.nl`;

    document.getElementById('loadingScreen').style.display = 'flex';

    emailjs.send("service_hcds2qk", "template_xk3jqlc", {
        message: emailBody,
        reply_to: email
    })
    .then(() => {
        console.log("E-mail naar kantoor succesvol verzonden");
        return emailjs.send("service_hcds2qk", "template_gco2wsm", {
            to_email: email,
            message: emailBody
        });
    })
    .then(() => {
        console.log("E-mail naar klant succesvol verzonden");
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
            grecaptcha.reset(); // reset reCAPTCHA na verzenden
            window.location.href = "https://www.klaasvis.nl";
        }, 2000);
    })
    .catch((error) => {
        console.error("Fout bij verzenden:", error);
        document.getElementById('loadingScreen').style.display = 'none';
        alert(`Er is een fout opgetreden: ${error.text}. Probeer het later opnieuw.`);
    });
});

// Chatbase integratie
(function() {
    if (!window.chatbase || window.chatbase('getState') !== 'initialized') {
        window.chatbase = (...args) => { if (!window.chatbase.q) window.chatbase.q = []; window.chatbase.q.push(args); };
        window.chatbase = new Proxy(window.chatbase, { get(target, prop) { if(prop==='q') return target.q; return (...args) => target(prop,...args); }});
    }
    const onLoad = function() {
        const script = document.createElement('script');
        script.src = 'https://www.chatbase.co/embed.min.js';
        script.id = 'C60jEJW_QuVD7X3vE5rzE';
        script.setAttribute('domain','www.chatbase.co');
        document.body.appendChild(script);
    };
    if (document.readyState === 'complete') onLoad(); else window.addEventListener('load', onLoad);
})();

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const selectElement = document.getElementById('wijziging-type');
    if (selectElement) { selectElement.addEventListener('change', toggleFields); toggleFields(); }

    const postcode = document.getElementById('nieuwe-postcode');
    const huisnummer = document.getElementById('nieuwe-huisnummer');
    const huidigKenteken = document.getElementById('huidig-kenteken');
    const nieuwKenteken = document.getElementById('nieuw-kenteken');

    if (postcode) postcode.addEventListener('blur', fetchPostcodeData);
    if (huisnummer) huisnummer.addEventListener('blur', fetchPostcodeData);
    if (huidigKenteken) huidigKenteken.addEventListener('blur', () => fetchRDWData('huidig-kenteken','huidig-merk','huidig-model'));
    if (nieuwKenteken) nieuwKenteken.addEventListener('blur', () => fetchRDWData('nieuw-kenteken','nieuw-merk','nieuw-model'));

    disableNonWorkingDays();
});

