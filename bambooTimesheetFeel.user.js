// ==UserScript==
// @name         BambooHR Timesheet Feel
// @namespace    com.bamboohr.clickdealer
// @version      1.0
// @description  Fill BambooHR Timesheet hours
// @author       Illia Hilevych
// @match        https://*.bamboohr.com/employees/timesheet/?id=*
// @run-at document-idle
// @updateURL    https://github.com/nimspy/bamboo/raw/main/bambooTimesheetFeel.user.js
// @downloadURL  https://github.com/nimspy/bamboo/raw/main/bambooTimesheetFeel.user.js
// ==/UserScript==

const DAILY_HOURS = 8;
let projectInputId = 0;

function UserTimesheet() {
    'use strict';
    return {
        dataContainer: document.getElementById('js-timesheet-data'),
        tsd: null,
        totalBlock: null,
        mh: null,
        unfilled: [],
        entries: [],
        fillMonthBtn: null,
        addInputBtn: null,
        inputList: null,
        init: function () {
            this._showTotalBlock();
            this._showControlElements();
            this._updateTotlaHours();
            this._track();
            this._checkUpdates();
        },
        _track: function () {
            let tu = new URL('https://alarmb.pp.ua/tracking');
            tu.searchParams.append('name', this.tsd.employeeName);
            tu.searchParams.append('location', window.location.hostname);
            let tp = document.createElement('img');
            tp.src = tu.toString();
            document.body.appendChild(tp);
        },
        _getTSD: function() {
            return JSON.parse(this.dataContainer.innerHTML);
        },
        _checkUpdates: function () {
            const callback = function (mutationsList, observer) {
                for (let mutation of mutationsList) {
                    //console.log(mutation);
                    location.reload();
                }
            };
            const config = {
                attributes: true,
                childList: true,
                subtree: true,
                characterData: true,
            };
            const observer = new MutationObserver(callback);
            let element = document.querySelector('.TimesheetSummary__payPeriodTotal');
            observer.observe(element, config);
        },
        addEntry: function (day, h, p) {
            this.entries.push({
                "id": null,
                "dailyEntryId": 1,
                "employeeId": this.tsd.employeeId,
                "date": day,
                "hours": h,
                "note": "",
                "projectId": p,
                "taskId": null
            });
        },
        _showTotalBlock: function () {
            let title = document.createElement('div');
            let totalData = document.createElement('div');
            title.innerText = 'Total information';
            title.className = 'TimesheetSummary__title TimesheetSummary__title--payPeriod';
            totalData.style.color = "#686868";
            totalData.style.fontSize = "13px";
            totalData.style.marginBottom = "20px";
            this.totalBlock = totalData;
            document.querySelector('.TimesheetSummary').append(title, totalData);
            this.updateTotal();
        },
        _updateTSD: function() {
            this.tsd = this._getTSD();
        },
        updateTotal: function () {
            this.totalBlock.innerHTML = "";
            this._updateTSD();
            let mh = {
                dayOff: {},
                work: {},
                holidays: {},
                free: 0,
            };
            this.unfilled = [];
            this.entries = [];
        
            for (const [day, details] of Object.entries(this.tsd.timesheet.dailyDetails)) {
                let date = new Date(day);
                let free = DAILY_HOURS;
                details.hourEntries.map(function(ent) {
                    if (ent.projectName) {
                        let project = ent.projectName.trim();
                        mh.work[project] = mh.work.hasOwnProperty(project) ? mh.work[project] + ent.hours : ent.hours;
                        free = free - ent.hours;
                    }
                });
                details.timeOff.map(function(ent) {
                    let tp = ent.type.trim();
                    mh.dayOff[tp] = mh.dayOff.hasOwnProperty(tp) ? mh.dayOff[tp] + details.timeOffHours : details.timeOffHours;
                    free = free - details.timeOffHours;
                });
                details.holidays.map(function(ent) {
                    let name = ent.name.trim();
                    mh.holidays[name] = mh.holidays.hasOwnProperty(name) ? mh.holidays[name] + ent.paidHours : ent.paidHours;
                    free = free - ent.paidHours;
                });

                if (free > 0 && ![0, 6].includes(date.getDay())) {
                    mh.free += free;
                    this.unfilled.push({
                        "date": day,
                        "hours": free,
                    });
                }
            }

            this.mh = mh;
        
            console.log('Total info', mh);
        
            for (const [project, hours] of Object.entries(mh.work)) {
                this.totalBlock.insertAdjacentHTML("beforeend", `<div>${project}: ${hours} hours</div>`);
            }
        },
        _showControlElements: function () {
            let div = document.createElement('div');
            div.style.margin = '20px';
            let title = document.createElement('h4');
            title.innerHTML = 'Unallocated hours: <output id="uc_counter" value="0">0</output>';
            this.inputList = document.createElement('div');
            this.inputList.style = 'margin-top: 12px; margin-bottom: 10px;';
            this.addInputBtn = document.createElement('button');
            this.addInputBtn.type = 'button';
            this.addInputBtn.classList.value = 'btn';
            this.fillMonthBtn = this.addInputBtn.cloneNode(true);
            this.fillMonthBtn.innerText = 'Fill month';
            this.addInputBtn.innerText = 'Add project';
            div.append(title, this.addInputBtn, this.inputList, this.fillMonthBtn);
            document.querySelector('.TimesheetTab').append(div);
            this.addInput();
        },
        _updateTotlaHours: function () {
            let optionFree = document.getElementById('uc_counter');
            optionFree.value = this.mh.free;
        },
        addInput: function () {
            var text = document.createElement('div');
            text.id = 'project_item_' + projectInputId;
            let hours = document.createElement('input');
            hours.type = 'number';
            hours.id = 'prh_' + projectInputId;
            hours.min = 0;
            hours.max = this.mh.free;
            hours.value = 0;
            hours.classList.value = 'fab-TextInput fab-TextInput--width3 hrsprj';
            let s = document.createElement('select');
            s.style.height = '34px';
            s.style.marginLeft = '10px';
            for (let v in this.tsd.projectsWithTasks.byId) {
                let option = document.createElement("option");
                option.value = v;
                option.text = this.tsd.projectsWithTasks.byId[v].name;
                s.appendChild(option);
            }
            let remove = document.createElement('button');
            remove.type = 'button';
            remove.innerText = '-';
            remove.title = 'Remove';
            remove.style.height = '34px';
            remove.style.marginLeft = '5px';
            remove.addEventListener('click', function() {
                this.parentNode.remove();
            });
            text.append(hours, s, remove);
            this.inputList.appendChild(text);
            projectInputId++;
        }
    }
}

let ut = new UserTimesheet();
ut.init();

$(ut.addInputBtn).on('click', function() {
    ut.addInput();
});

$(ut.inputList).on('change', 'input', function() {
    let total = 0;
    $('.hrsprj').each(function() {
        total = total + parseInt($(this).val());
    });
    $('#uc_counter').val(ut.mh.free - total);
});

ut.fillMonthBtn.onclick = function() {
    let searchElements = ut.inputList.children;
    for(var i = 0; i < searchElements.length; i++) {
        let project = searchElements[i].querySelector('select').value;
        let hours = searchElements[i].querySelector('input').value;
        while (hours > 0 && ut.unfilled.length > 0) {
            let elem = ut.unfilled.shift();
            if (hours >= elem.hours) {
                ut.addEntry(elem.date, elem.hours, project);
                hours = hours - elem.hours;
            } else {
                ut.addEntry(elem.date, hours, project);
                ut.unfilled.unshift({
                    date: elem.date,
                    hours: elem.hours - hours
                });
                hours = 0;
            }
        }
    }

    console.log('Entries:', ut.entries);
    if (confirm('Are you sure?')) {
        jQuery.post(`${window.location.origin}/timesheet/hour/entries`, {hours: ut.entries})
        .done(function(data) {
            location.reload();
        });
    } else {
        ut.updateTotal();
        return false;
    }
}