// ==UserScript==
// @name         BambooHR Timesheet Feel
// @namespace    com.bamboohr.clickdealer
// @version      0.4
// @description  Fill BambooHR Timesheet hours
// @author       Illia Hilevych
// @match        https://*.bamboohr.com/employees/timesheet/?id=*
// @run-at document-idle
// @updateURL    https://github.com/nimspy/bamboo/raw/main/bambooTimesheetFeel.user.js
// @downloadURL  https://github.com/nimspy/bamboo/raw/main/bambooTimesheetFeel.user.js
// ==/UserScript==

const DAILY_HOURS = 8;

(async function() {
    'use strict';

    let tsd = JSON.parse(document.getElementById('js-timesheet-data').innerHTML);
    let div = document.createElement('div');
    let s = document.createElement('select');
    let btn = document.createElement('button');
    div.append(s, btn);
    div.style.margin = '20px';
    s.style.height = '27px';
    for (let v in tsd.projectsWithTasks.byId) {
        let option = document.createElement("option");
        option.value = v;
        option.text = tsd.projectsWithTasks.byId[v].name;
        s.appendChild(option);
    }
    btn.type = 'button';
    btn.classList.value = 'btn';
    btn.innerText = 'Fill month';

    document.querySelector('.TimesheetTab').append(div);

    /* show total information */
    let title = document.createElement('div');
    let totalData = document.createElement('div');
    title.innerText = 'Total information';
    title.className = 'TimesheetSummary__title TimesheetSummary__title--payPeriod';
    totalData.style.color = "#686868";
    totalData.style.fontSize = "13px";
    totalData.style.marginBottom = "20px";
    document.querySelector('.TimesheetSummary').append(title, totalData);

    let mh = {
        dayOff: {},
        work: {},
        holidays: {}
    };


    for (const [day, details] of Object.entries(tsd.timesheet.dailyDetails)) {
        details.hourEntries.map(function(ent) {
            if (ent.projectName) {
                let project = ent.projectName.trim();
                mh.work[project] = mh.work.hasOwnProperty(project) ? mh.work[project] + ent.hours : ent.hours;
            }
        });
        details.timeOff.map(function(ent) {
            let tp = ent.type.trim();
            mh.dayOff[tp] = mh.dayOff.hasOwnProperty(tp) ? mh.dayOff[tp] + details.timeOffHours : details.timeOffHours;
        });
        details.holidays.map(function(ent) {
            let name = ent.name.trim();
            mh.holidays[name] = mh.holidays.hasOwnProperty(name) ? mh.holidays[name] + ent.paidHours : ent.paidHours;
        });
    }

    console.log('Total info', mh);

    for (const [project, hours] of Object.entries(mh.work)) {
        totalData.insertAdjacentHTML("beforeend", `<div>${project}: ${hours} hours</div>`);
    }

    btn.onclick = function() {
        let skipped = [];
        let entries = [];

        for (const [day, details] of Object.entries(tsd.timesheet.dailyDetails)) {
            let date = new Date(day);

            /* Skip weekend */
            if ([0, 6].includes(date.getDay())) {
                continue;
            }

            /* Skip filled */
            if (details.hours >= DAILY_HOURS) {
                continue;
            }

            /* Skip holidays & time off */
            let skip_reasons = [];

            skip_reasons.push(...details.holidays.map(h => `${h.name.trim()} (${h.paidHours} hours)`));
            skip_reasons.push(...details.timeOff.map(t => `${t.type.trim()} (${t.amount} ${t.unit})`));

            if (skip_reasons.length > 0) {
                skipped.push(`${day}: ${skip_reasons.join(", ")}`);
                continue;
            }

            let hours = (details.hours) ? DAILY_HOURS - details.hours : DAILY_HOURS;
            entries.push({
                "id": null,
                "dailyEntryId": 1,
                "employeeId": tsd.employeeId,
                "date": day,
                "hours": hours,
                "note": "",
                "projectId": s.value,
                "taskId": null
            });
        }
        console.log('Skipped:', skipped);
        console.log('Entries:', entries);

        if (confirm('Are you sure?')) {
            jQuery.post(`${window.location.origin}/timesheet/hour/entries`, {hours: entries});
        } else {
            return false;
        }
    };
})();
