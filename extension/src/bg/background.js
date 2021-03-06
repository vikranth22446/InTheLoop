/*global console, window, chrome, $, document, CryptoJS, setTimeout, key*/
/* jshint shadow:true */

//TODO: Set correct version number
var ITLversion = "V0.6.0";
var grades = [];

var getYear = function () {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1; //Jan is 0
    var yyyy = today.getFullYear();
    if (dd < 10)
        dd = '0' + dd;
    if (mm < 10)
        mm = '0' + mm;
    var today = dd + '/' + mm + '/' + yyyy;
    return today;
};
var yearVal = getYear();
var constants = {
    "version": "2",
    "devToken": "599F9C00-92DC-4B5C-9464-7971F01F8370",
    "year": yearVal,
    "devOS": "5"
};

var setStudentID = function (bString, subdomain) {
    function set(data) {
        var studentID = data.students[0].studentID;
        setPeriodIDs(bString, studentID, subdomain);
    }
    $.ajax({
        type: "GET",
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Basic ' + bString);
        },
        success: function (msg) {
            clearBadge();
            set(JSON.parse(msg));
        },
        error: function (errormessage) {
            if(errormessage.status === 401){
                var errorResp = (""+errormessage.responseText);
                if(errorResp.indexOf("1") > -1)
                badgeError("ERR", "Username not found");                
                else if(errorResp.indexOf("2") > -1)
                    badgeError("ERR", "Password incorrect");
            }
            else if (errormessage.status === 0)
                badgeError("ERR", "Unable to access School Loop");
            console.log("studentID err: ");
            console.log(errormessage);
        }
    });
};
var setPeriodIDs = function (bString, studentID, subdomain) {
    function set(data) {
        var periodIDs = [];
        for (var i = 0; i < data.length; i++)
        {
            periodIDs.push({
                courseName: data[i].courseName,
                periodID: data[i].periodID
            });
        }
        gradesFromIDs(bString, periodIDs, 0, subdomain, studentID);
    }
    $.ajax({
        type: "GET",
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Basic ' + bString);
        },
        success: function (msg) {
            clearBadge();
            set(JSON.parse(msg));
        },
        error: function (errormessage) {
            if(errormessage.status === 401){
                var errorResp = (""+errormessage.responseText);
                if(errorResp.indexOf("1") > -1)
                badgeError("ERR", "Username not found");                
                else if(errorResp.indexOf("2") > -1)
                    badgeError("ERR", "Password incorrect");
            }
            else if (errormessage.status === 0)
                badgeError("ERR", "Unable to access School Loop");
            console.log("setPeriodIDs err: ");
            console.log(errormessage);
        }
    });
};
var gradesFromIDs = function (bString, periodIDs, i, subdomain, studentID) {
    if (i >= periodIDs.length) {
        checkForChanges();
        return;
    }
    $.ajax({
        type: "GET",
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Basic ' + bString);
        },
        data: {
            studentID: studentID,
            periodID: periodIDs[i].periodID
        },
        success: function (msg) {
            clearBadge();
            var data = JSON.parse(msg);
            var objP = {};
            objP.name = periodIDs[i].courseName + "";
            objP.perc = parseFloat(data[0].score) * 100;
            grades.push(objP);
            gradesFromIDs(bString, periodIDs, i + 1, subdomain, studentID);
        },
        error: function (errormessage) {
            if(errormessage.status === 401){
                var errorResp = (""+errormessage.responseText);
                if(errorResp.indexOf("1") > -1)
                badgeError("ERR", "Username not found");                
                else if(errorResp.indexOf("2") > -1)
                    badgeError("ERR", "Password incorrect");
            }
            else if (errormessage.status === 0)
                badgeError("ERR", "Unable to access School Loop");
            console.log("gradesFromIDs err: ");
            console.log(errormessage);
        }
    });
};

function isEmpty(map) {
    for (var key in map) {
        if (map.hasOwnProperty(key)) {
            return false;
        }
    }
    return true;
}

var checkForChanges = function () {
    chrome.storage.local.get("classes", function (obj) {
        var classes = obj.classes;
        if (isEmpty(classes)) {
            var objToSync = {};
            for (var i = 0; i < grades.length; i++) {
                objToSync[grades[i].name] = grades[i].perc;
            }
            chrome.storage.local.set({
                classes: objToSync
            });
            return;
        } else {
            var arr = [];
            for (var i = 0; i < grades.length; i++) {
                if (obj.classes[grades[i].name] != grades[i].perc) {
                    console.log("Grade Discrepancy for class " + grades[i].name + ". " +
                        obj.classes[grades[i].name] + " vs " + grades[i].perc);
                    arr.push(grades[i].name);
                }
            }
            if (arr.length > 0) {
                var s = "";
                if (arr.length == 1)
                    s = "Your " + arr[0] + " grade has changed!";
                else if (arr.length == 2)
                    s = "Grades have changed for " + arr[0] + " and " + arr[1] + "!";
                else {
                    s = "Grades have changed for ";
                    for (i = 0; i < arr.length - 1; i++)
                        s += arr[i] + ", ";
                    s += "and " + arr[arr.length - 1] + "!";
                }
                chrome.storage.local.get("sl_subdomain", function (data) {
                    createNotification("2", "In The Loop Notification", s, "https://" + data.sl_subdomain + ".schoolloop.com/portal/student_home", function () {});
                });
            }
            var objToSync = {};
            for (i = 0; i < grades.length; i++) {
                objToSync[grades[i].name] = grades[i].perc;
            }
            chrome.storage.local.set({
                classes: objToSync
            });
        }
    });
};

function createNotification(id, title, message, url, callback) {
    var options = {
        type: "basic",
        iconUrl: "icons/notif.png",
        title: title,
        message: message
    };

    chrome.notifications.create(id, options, function (createdId) {
        var handler = function (id) {
            if(createdId === "1"){
                if (chrome.runtime.openOptionsPage)
                    chrome.runtime.openOptionsPage();
                else
                    window.open(chrome.runtime.getURL('src/options/options.html'));
            }
            else if (id == createdId) {
                window.open(url);
                chrome.notifications.clear(id);
                chrome.notifications.onClicked.removeListener(handler);
            }
        };
        chrome.notifications.onClicked.addListener(handler);
        if (typeof callback == "function") callback();
    });
}

chrome.runtime.onInstalled.addListener(function (details) {
    console.log("InTheLoop: onInstalled listener evoked. Reason: " + details.reason);
    if(details.reason == "install"){
        createNotification("1", "Welcome to In The Loop " + ITLversion, "Click to set up notifications", "chrome://extensions/?options=ppigcngidmooiiafkelbilbojiijffag", function () {});
        chrome.storage.local.set({
            classes: {},
            username: "",
            password: "",
            popupMsg: "",
            notifs: true,
            sandbox_enabled: true,
            sl_subdomain: "montavista"
        });
    }
    else if(details.reason == "update"){
        createNotification("1", "In The Loop has just updated!", "Click to change options", "chrome://extensions/?options=ppigcngidmooiiafkelbilbojiijffag", function () {});
    }
});

//TODO: remove in production
function testChangeGrade(className, callCheck) {
    chrome.storage.local.get("classes", function (obj) {
        var x = obj.classes;
        x[className] = 12;
        chrome.storage.local.set({
            classes: x
        });
    });
    if (callCheck) checkFunc();
}

//TODO: remove in production
function testNotification() {
    chrome.storage.local.get("sl_subdomain", function (data) {
        createNotification("2", "In The Loop Notification", "Test", "https://" + data.sl_subdomain + ".schoolloop.com/portal/student_home", function () {});
    });
}

function checkFunc() {
    var exitFunc = function () {
        console.log("In The Loop notifications are disabled!");
        return;
    };
    chrome.storage.local.get("notifs", function (data) {
        if (!data.notifs) exitFunc();
    });

    chrome.storage.local.get(["sl_subdomain", "username", "password"], function (obj) {
        if (obj.username === "" || obj.password === "" || obj.sl_subdomain === "") {
            badgeError("ERR", "Please set your username, password, & school subdomain.");
        } else {
            grades = [];
            //TODO: hide key
            parseGradeChanges(obj.username, CryptoJS.AES.decrypt(obj.password, key).toString(CryptoJS.enc.Utf8), obj.sl_subdomain);
        }
    });
}

function parseGradeChanges(username, password, subdomain) {
    /* jshint ignore:start */ //in order to avoid "btoa" is undefined
    var bCred = btoa(username + ":" + password);
    setStudentID(bCred, subdomain); //calls setPeriodIDs which calls gradesFromIDs
    /* jshint ignore:end */
}

chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name === "NotificationsAlarm") {
        checkFunc();
    }
});

chrome.alarms.create("NotificationsAlarm", {
    delayInMinutes: 1,
    periodInMinutes: 5
});

//TODO: remove in production
function printGrades() {
    chrome.storage.local.get("classes", function (obj) {
        console.log(obj.classes);
    });
}

function clearBadge() {
    badgeError("", "");
}

function badgeError(badge, popup) {
    chrome.browserAction.setBadgeText({
        'text': badge
    });
    chrome.storage.local.set({
        popupMsg: popup
    });
}

//example of using a message handler from the inject scripts
chrome.extension.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.action === "setBadge") {
            badgeError(request.badgeTitle, request.badgeText);
        }
        else if(request.action === "console.log"){
            console.log(request.message);
        }
        else if(request.action === "createSimpleNotification"){
            var options = {
                type: "basic",
                iconUrl: "icons/notif.png",
                title: request.title,
                message: request.message
            };
            chrome.notifications.create(request.id, options, function(id) {
                var timer = setTimeout(function(){chrome.notifications.clear(id);}, request.timeout);
            });
        }
    }
);
