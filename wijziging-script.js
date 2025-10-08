// ======================
// Menubalk (hamburger menu)
// ======================
const hamburger = document.querySelector('.hamburger');
const navList = document.querySelector('.nav-list');

if (hamburger && navList) {
    hamburger.addEventListener('click', () => {
        navList.classList.toggle('active');
    });
}

// ======================
// Dynamische velden wijziging-type
// ======================
function toggleFields() {
    const wijzigingType = document.getElementById('wijziging-type')?.value;
    const fieldGroups = {
        'adreswijziging': ['adreswijziging-fields-postcode', 'adreswijziging-fields-huisnummer', 'adreswijziging-fields-adres', 'adreswijziging-fields-datum'],
        'motorvoertuigwijziging': ['motorvoertuigwijziging-fields-datum', 'motorvoertuigwijziging-fields-polisnummer', 'motorvoertuigwijziging-fields-huidig-kenteken', 'motorvoertuigwijziging-fields-huidig-merk', 'motorvoertuigwijziging-fields-huidig-model', 'motorvoertuigwijziging-fields-nieuw-kenteken', 'motorvoertuigwijziging-fields-nieuw-merk', 'motorvoertuigwijziging-fields-nieuw-model'],
        'verzekering-beëindigen': ['verzekering-beëindigen-fields-datum', 'verzekering-beëindigen-fields-reden'],
        'terugbelverzoek': ['terugbelverzoek-fields-telefoon', 'terugbelverzoek-fields-datum', 'terugbelverzoek-fields-tijd'],
        'emailwijziging': ['emailwijziging-fields-huidig', 'emailwijziging-fields-nieuw'],
        'anders': ['anders-fields']
    };

    // Verberg alles eerst
    Object.values(fieldGroups).flat().forEach(id => {
        const element = document.getElementById(id);
        if (element) element.classList.add('hidden');
    });

    // Toon gekozen velden
    if (fieldGroups[wijzigingType]) {
        fieldGroups[wijzigingType].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.classList.remove('hidden');
        });
    }
}

// ======================
// Postcode API (adreswijziging)
// ======================
async function fetchPostcodeData() {
    const postcodeInput = document.getElementById('nieuwe-postcode');
    const huisnummerInput = document.getElementById('nieuwe-huisnummer');
    if (!postcodeInput || !huisnummerInput) return;

    const postcode = postcodeInput.value.replace(/\s/g, '');
    const huisnummer = huisnummerInput.value;
    if (!postcode || !huisnummer) return;

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

// ======================
// RDW API (motorvoertuig)
// ======================
async function fetchRDWData(kentekenField, merkField, modelField) {
    const kentekenInput = document.getElementById(kentekenField);
    if (!kentekenInput) return;

    const kenteken = kentekenInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!kenteken) return;

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

// ======================
// Kalender logica (werkdagen & feestdagen)
// ======================
function disableNonWorkingDays() {
    const dateInput = document.getElementById('voorkeur-datum');
    if (!dateInput) return;

    const holidays2025 = [
        '2025-01-01', '2025-04-18', '2025-04-21', '2025-04-27', '2025-05-05', 
        '2025-05-29', '2025-06-09', '2025-12-25', '2025-12-26'
    ];

    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);

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
}

// ======================
// Formulier verzenden (EmailJS + reCAPTCHA)
// ======================
document.addEventListener('DOMContentLoaded', () => {

    // Formulier submit
    const form = document.getElementById('wijziging-form');
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();

            // reCAPTCHA check
            const recaptchaResponse = grecaptcha.getResponse();
            if (!recaptchaResponse) {
                alert("Bevestig eerst dat u geen robot bent (klik op de reCAPTCHA).");
                return;
            }

            const formData = new FormData(form);
            const email = formData.get('email') || 'rbuijs@klaasvis.nl';
            let emailBody = `Contactverzoek Klaas Vis Assurantiekantoor\n\n`;

            for (let [key, value] of formData.entries()) {
                if (key === 'g-recaptcha-response') continue; // niet meesturen
                if (value && value.trim() !== '') {
                    emailBody += `${key}: ${value}\n`;
                }
            }

            emailBody += `\nHeeft u in de tussentijd vragen? U kunt ons bereiken via:\n- E-mail: info@klaasvis.nl\n- Telefoon: 075 – 631 42 61 (werkdagen 09:00-16:00)\n\nMet vriendelijke groet,\nTeam Klaas Vis Assurantiekantoor\nZuiderweg 7, 1456 NC Wijdewormer\nwww.klaasvis.nl`;

            document.getElementById('loadingScreen').style.display = 'flex';

            // EmailJS verzenden
            emailjs.send("service_hcds2qk", "template_xk3jqlc", {
                message: emailBody,
                reply_to: email
            })
            .then(() => {
                return emailjs.send("service_hcds2qk", "template_gco2wsm", {
                    to_email: email,
                    message: emailBody
                });
            })
            .then(() => {
                setTimeout(() => {
                    document.getElementById('loadingScreen').style.display = 'none';
                    window.location.href = "https://www.klaasvis.nl";
                }, 2000);
            })
            .catch(error => {
                console.error("Fout bij verzenden:", error);
                document.getElementById('loadingScreen').style.display = 'none';
                alert(`Er is een fout opgetreden: ${error.text}. Probeer het later opnieuw.`);
            });
        });
    }

    // Event listeners voor dynamische velden
    const wijzigingSelect = document.getElementById('wijziging-type');
    if (wijzigingSelect) {
        wijzigingSelect.addEventListener('change', toggleFields);
        toggleFields();
    }

    // Postcode / RDW listeners
    const postcode = document.getElementById('nieuwe-postcode');
    const huisnummer = document.getElementById('nieuwe-huisnummer');
    const huidigKenteken = document.getElementById('huidig-kenteken');
    const nieuwKenteken = document.getElementById('nieuw-kenteken');

    if (postcode) postcode.addEventListener('blur', fetchPostcodeData);
    if (huisnummer) huisnummer.addEventListener('blur', fetchPostcodeData);
    if (huidigKenteken) huidigKenteken.addEventListener('blur', () => fetchRDWData('huidig-kenteken','huidig-merk','huidig-model'));
    if (nieuwKenteken) nieuwKenteken.addEventListener('blur', () => fetchRDWData('nieuw-kenteken','nieuw-merk','nieuw-model'));

    disableNonWorkingDays();

    // ======================
    // Chatbase chatbot
    // ======================
    if (!window.chatbase || window.chatbase('getState') !== 'initialized') {
        window.chatbase = (...args) => { 
            if (!window.chatbase.q) window.chatbase.q = []; 
            window.chatbase.q.push(args); 
        };
        window.chatbase = new Proxy(window.chatbase, {
            get(target, prop) {
                if (prop === 'q') return target.q;
                return (...args) => target(prop, ...args);
            }
        });
    }

    const chatScript = document.createElement('script');
    chatScript.src = 'https://www.chatbase.co/embed.min.js';
    chatScript.id = 'C60jEJW_QuVD7X3vE5rzE';
    chatScript.setAttribute('domain', 'www.chatbase.co');
    document.body.appendChild(chatScript);

});
