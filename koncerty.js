(() => {
    const archiveSections = document.querySelectorAll("main > section[data-concert-year]");

    function getTodayInSlovakia() {
        const parts = new Intl.DateTimeFormat("en", {
            timeZone: "Europe/Bratislava",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(new Date());
        const values = Object.fromEntries(parts.map(part => [part.type, part.value]));

        return `${values.year}-${values.month}-${values.day}`;
    }

    function isPastConcert(card, today) {
        const date = card.dataset.concertDate;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
            throw new Error(`Neplatný dátum koncertu: ${date}`);
        }

        return date < today;
    }

    function getArchiveList(year) {
        let section = document.querySelector(`main > section[data-concert-year="${year}"]`);

        if (!section) {
            section = document.createElement("section");
            section.dataset.concertYear = year;

            const heading = document.createElement("h3");
            heading.textContent = `Koncerty ${year}`;

            const list = document.createElement("div");
            list.className = "concert-list";
            section.append(heading, list);

            const nextSection = [...document.querySelectorAll("main > section[data-concert-year]")]
                .find(item => Number(item.dataset.concertYear) < year);
            document.querySelector("main").insertBefore(section, nextSection || null);
        }

        return section.querySelector(".concert-list");
    }

    function sortConcerts() {
        document.querySelectorAll("main .concert-list").forEach(list => {
            [...list.querySelectorAll(":scope > .concert-card")]
                .sort((a, b) => a.dataset.concertDate.localeCompare(b.dataset.concertDate))
                .forEach(card => list.append(card));
        });

        const sections = [...document.querySelectorAll("main > section[data-concert-year]")]
            .sort((a, b) => Number(a.dataset.concertYear) - Number(b.dataset.concertYear));
        sections.forEach(section => document.querySelector("main").append(section));
    }

    async function movePastConcerts(today) {
        if (archiveSections.length) {
            const response = await fetch("index.html");
            if (!response.ok) {
                throw new Error(`Načítanie plánovaných koncertov zlyhalo: ${response.status}`);
            }

            const html = await response.text();
            const page = new DOMParser().parseFromString(html, "text/html");
            const pastConcerts = [...page.querySelectorAll(".concert-card[data-concert-date]")]
                .filter(card => isPastConcert(card, today));

            for (const card of pastConcerts) {
                const archivedCard = card.cloneNode(true);

                const concertInfo = archivedCard.querySelector(".concert-info");
                if (!concertInfo) {
                    throw new Error("Plánovanému koncertu chýbajú informácie.");
                }

                const status = document.createElement("p");
                const label = document.createElement("strong");
                label.textContent = "Status:";
                status.append(label, " Odohrané");
                concertInfo.append(status);

                getArchiveList(Number(card.dataset.concertDate.slice(0, 4))).append(archivedCard);
            }
            sortConcerts();
            return;
        }

        document.querySelectorAll(".concert-card[data-concert-date]").forEach(card => {
            if (isPastConcert(card, today)) {
                card.remove();
            }
        });
        sortConcerts();
    }

    sortConcerts();

    let lastProcessedDate = "";
    let isUpdating = false;

    function updateForToday() {
        const today = getTodayInSlovakia();
        if (today === lastProcessedDate || isUpdating) {
            return;
        }

        isUpdating = true;
        movePastConcerts(today)
            .then(() => {
                lastProcessedDate = today;
            })
            .catch(error => {
                console.error("Koncerty sa nepodarilo aktualizovať.", error);
            })
            .finally(() => {
                isUpdating = false;
            });
    }

    updateForToday();
    window.setInterval(updateForToday, 60_000);
})();
