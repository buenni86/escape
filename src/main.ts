/// <reference types="@workadventure/iframe-api-typings" />

import { bootstrapExtra } from "@workadventure/scripting-api-extra";
import { CreateUIWebsiteEvent } from "@workadventure/iframe-api-typings/Api/Events/Ui/UIWebsite";

console.log('Script started successfully');

let currentPopup: any = undefined;

// Waiting for the API to be ready
WA.onInit().then(() => {
    console.log('Scripting API ready');
    console.log('Player tags: ',WA.player.tags)

    const mapUrl = WA.room.mapURL
    const root = mapUrl.substring(0, mapUrl.lastIndexOf("/"))

    const information: CreateUIWebsiteEvent = {
        url:  root + "/information.html",
        visible: true,
        allowApi: true,
        allowPolicy: "",   // The list of feature policies allowed
        position: {
            vertical: "top",
            horizontal: "middle",
        },
        size: {            // Size on the UI (available units: px|em|%|cm|in|pc|pt|mm|ex|vw|vh|rem and others values auto|inherit)
            width: "800px",
            height: "200px",
        },
    }

    // ROOM 1
    const clueWarning = "Asking for a clue will cost you 1 minute."
    const cheatWarning = "You have to start over. This may be due to data corruption or you are trying to cheat ^^"
    let cigaretteFound = false

    WA.room.onEnterLayer("cigarette").subscribe(() => {
        if (WA.state.CigaretteVisible) {
            currentPopup = WA.ui.openPopup("cigarettePopup", "A cigarette left on the ground. There is a trash can for that, but this person was obviously in a hurry.", [])
            cigaretteFound = true
            WA.state.CigaretteVisible = false
        }
    })
    WA.room.onLeaveLayer("cigarette").subscribe(closePopup)

    WA.room.area.onEnter("garbageCan").subscribe(() => {
        if (cigaretteFound && !WA.state.CigaretteComplete) {
            currentPopup = WA.ui.openPopup("garbageCanPopup", "You throw the cigarette in the garbage can. Thank you.", [])
            WA.state.CigaretteComplete = true
        }
    })
    WA.room.area.onLeave("garbageCan").subscribe(closePopup)

    WA.room.area.onEnter("info").subscribe(() => {
        currentPopup = WA.ui.openPopup("infoPopup", "The goal is to enter all together in the train n°1 and to start it in order to escape!\nThe door can only be opened by the robot in front of the door if you complete all the riddles.", [])
    })
    WA.room.area.onLeave("info").subscribe(closePopup)

    WA.room.area.onEnter("game").subscribe(() => {
        currentPopup = WA.ui.openPopup("gamePopup", "I'm playing Tic-tac-toe but I'm tired of playing against this robot. Can you try to win the game with circles?", [])
        WA.state.TicTacToeStarted = true
    })
    WA.room.area.onLeave("game").subscribe(closePopup)

    WA.room.onEnterLayer("tic-tac-toe").subscribe(() => {
        if (WA.state.TicTacToeStarted) {
            WA.state.TicTacToeOngoing = true
            WA.room.setProperty("tic-tac-toe", "silent", true)

        }
    })
    WA.room.onLeaveLayer("tic-tac-toe").subscribe(() => {
        if (!WA.state.TicTacToeComplete) {
            WA.state.TicTacToeOngoing = false
        }
    })

    WA.room.onEnterLayer("tic-tac-toe-play1").subscribe(() => {
        if (WA.state.TicTacToeStarted) {
            WA.state.TicTacToePlay1 = true
            WA.state.TicTacToeComplete = WA.state.TicTacToePlay2
        }
    })
    WA.room.onLeaveLayer("tic-tac-toe-play1").subscribe(() => {
        if (!WA.state.TicTacToeComplete) {
            WA.state.TicTacToePlay1 = false
        }
    })

    WA.room.onEnterLayer("tic-tac-toe-play2").subscribe(() => {
        if (WA.state.TicTacToeStarted) {
            WA.state.TicTacToePlay2 = true
            WA.state.TicTacToeComplete = WA.state.TicTacToePlay1
        }
    })
    WA.room.onLeaveLayer("tic-tac-toe-play2").subscribe(() => {
        if (!WA.state.TicTacToeComplete) {
            WA.state.TicTacToePlay2 = false
        }
    })    

    WA.chat.onChatMessage((message => {
        if (WA.state.QuestionOngoing) {
            WA.state.QuestionComplete = message == "46"
            if (WA.state.QuestionComplete) {
                WA.chat.sendChatMessage("Correct. You can now enter.", "KindRobot000")
                WA.state.TrainDoorOpen = true
            } else {
                WA.chat.sendChatMessage("Incorrect. You now have to start all over again.", "KindRobot000")
                WA.state.TicTacToeStarted = false
                WA.state.TicTacToeOngoing = false
                WA.state.TicTacToePlay1 = false
                WA.state.TicTacToePlay2 = false
                WA.state.TicTacToeComplete = false
                WA.state.CigaretteVisible = true
                cigaretteFound = false
                WA.state.CigaretteComplete = false
                WA.state.QuestionOngoing = false
                WA.state.QuestionComplete = false
                WA.state.TrainDoorOpen = false
            }
        }
    }));

    WA.room.area.onEnter("room1bot").subscribe(() => {
        if (WA.state.QuestionComplete) return
        if (WA.state.TicTacToeComplete && WA.state.CigaretteComplete) {
            WA.chat.sendChatMessage("Mr Robot: Type your answer here, but think carefully! If you make a mistake you will have to start all over again", "KindRobot000")
            WA.state.QuestionOngoing = true
        } else {
            currentPopup = WA.ui.openPopup("room1botPopup", "Mr Robot: Stranger, I'll block the access to this train until you prove your worth. " + clueWarning, [
                {
                    label: 'Give me a clue',
                    className: 'primary',
                    callback: () => giveClue(1),
                }
            ])
        }
    })
    WA.room.area.onLeave("room1bot").subscribe(closePopup)

    WA.room.area.onEnter("goToDriverCabine").subscribe(() => {
        WA.nav.goToRoom("#driver-cabine")
        const x = 137*32
        const y = 16*32
        WA.camera.set(x, y, 500, 500, false, true)
    })

    // ROOM 2
    WA.room.onEnterLayer("driver-cabine").subscribe(() => {
        // anti-cheat
        if (!WA.state.TrainDoorOpen) {
            WA.controls.disablePlayerControls()
            currentPopup = WA.ui.openPopup("driverCabinePopup", cheatWarning, [])
        }
    })

    WA.room.area.onEnter("room2bot").subscribe(() => {
        if (WA.state.TrainStarted) return
        currentPopup = WA.ui.openPopup("room2botPopup", "Stranger, it seems this train is not going to start until you find the right key. " + clueWarning, [
            {
                label: 'Give me a clue',
                className: 'primary',
                callback: () => giveClue(2),
            }
        ])
    })
    WA.room.area.onLeave("room2bot").subscribe(closePopup)

    WA.room.area.onEnter("room2coffee").subscribe(() => {
        currentPopup = WA.ui.openPopup("room2coffeePopup", "You found a cup of coffee. Studies have shown that the optimal consumption for healthy adults is 3 cups of coffee.", [])
    })
    WA.room.area.onLeave("room2coffee").subscribe(closePopup)

    WA.room.area.onEnter("room2pretzel").subscribe(() => {
        currentPopup = WA.ui.openPopup("room2pretzelPopup", "You found a Pretzel. Given the size of this Pretzel, 1 is more than enough for breakfast!", [])
    })
    WA.room.area.onLeave("room2pretzel").subscribe(closePopup)

    WA.room.area.onEnter("room2oldMap").subscribe(() => {
        currentPopup = WA.ui.openPopup("room2oldMapPopup", "You found an old map. It is very rare. Only 8 like this one exist in the world!", [])
    })
    WA.room.area.onLeave("room2oldMap").subscribe(closePopup)

    WA.room.area.onEnter("room2coins").subscribe(() => {
        currentPopup = WA.ui.openPopup("room2coinsPopup", "You found some coins. 5 more and you might be able to trade them for a bank bill.", [])
    })
    WA.room.area.onLeave("room2coins").subscribe(closePopup)

    WA.room.onEnterLayer("teleportRoom3").subscribe(() => {
        if (WA.state.TrainStarted) {
            currentPopup = WA.ui.openPopup("teleportRoom3Popup", "Now that the train can start, you can go to the next room!", [
                {
                    label: 'Teleport',
                    className: 'primary',
                    callback: () => {
                        WA.nav.goToRoom("#max-maulwurf")
                        const x = 241*32
                        const y = 27*32
                        WA.camera.set(x, y, 500, 500, false, true)
                    },
                }]
            )
        }
    })
    WA.room.onLeaveLayer("teleportRoom3").subscribe(closePopup)

    // ROOM 3
    WA.room.onEnterLayer("max-maulwurf").subscribe(() => {
        // anti-cheat
        if (!WA.state.TrainStarted) {
            WA.controls.disablePlayerControls()
            currentPopup = WA.ui.openPopup("room3Popup", cheatWarning, [])
        }
    })
    WA.room.onLeaveLayer("max-maulwurf").subscribe(closePopup)

    WA.room.area.onEnter("trainRoom3").subscribe(() => {
        currentPopup = WA.ui.openPopup("room3Popup", "Oops, looks like the train has been stopped immediately! Investigate the area to find out what happened.", [])
    })
    WA.room.area.onLeave("trainRoom3").subscribe(closePopup)

    WA.room.area.onEnter("room3bot").subscribe(() => {
        if (WA.state.isMaxHappy) return
        currentPopup = WA.ui.openPopup("room3botPopup", "Stranger, it seems your beloved Max Maulwurf is hungry. You will be blocked here until you comfort him. " + clueWarning, [
            {
                label: 'Give me a clue',
                className: 'primary',
                callback: () => giveClue(3),
            }
        ])
    })
    WA.room.area.onLeave("room3bot").subscribe(closePopup)

    WA.room.area.onEnter("room3helmet").subscribe(() => {
        currentPopup = WA.ui.openPopup("room3helmetPopup", "You found the yellow work helmet! This should help to calm down Max Maulwurf.", [])
        WA.state.helmetFound = true
    })
    WA.room.area.onLeave("room3helmet").subscribe(closePopup)

    WA.room.area.onEnter("room3DBtrophy").subscribe(() => {
        currentPopup = WA.ui.openPopup("room3DBtrophyPopup", "You found the DB trophy! This should help to calm down Max Maulwurf.", [])
        WA.state.DBtrophyFound = true
    })
    WA.room.area.onLeave("room3DBtrophy").subscribe(closePopup)

    WA.room.area.onEnter("room3WAmug").subscribe(() => {
        currentPopup = WA.ui.openPopup("room3WAmugPopup", "You found the WorkAdventure coffee mug! This should help to calm down Max Maulwurf.", [])
        WA.state.WAmugFound = true
    })
    WA.room.area.onLeave("room3WAmug").subscribe(closePopup)

    WA.room.area.onEnter("maxMaulwurf").subscribe(() => {
        if (WA.state.powerRestarted) {
            currentPopup = WA.ui.openPopup("maxMaulwurfPopup", "Thank you all for fixing the train station!", [])
        } else if (WA.state.WAmugFound && WA.state.helmetFound && WA.state.DBtrophyFound) {
            WA.room.hideLayer("maxHungry")
            WA.room.showLayer("maxHappy")
            currentPopup = WA.ui.openPopup("maxMaulwurfPopup", "You give the 3 items to Max. After receiving all the items, he calms down and pauses while looking at his beloved helmet. "
            + "He remembers his time in DB: his main task was to inform about construction and repairs... "
            + "He apologizes and agrees to power ON the power supply. Hurry and restart the train traffic control system at the terminal to avoid further delays!", [])
            WA.state.isMaxHappy = true
        } else {
            currentPopup = WA.ui.openPopup("maxMaulwurfPopup", "Max looks hungry... it seems he is the one who caused the damage in the power station "
            + "because he's mad that he's no longer the railroad mascot.", [])
        }
    })
    WA.room.area.onLeave("maxMaulwurf").subscribe(closePopup)

    WA.room.area.onEnter("terminal").subscribe(() => {
        if (WA.state.isMaxHappy) {
            if (WA.state.powerRestarted) {
                WA.nav.openCoWebSite(WA.state.formURL as string)
            } else {
                currentPopup = WA.ui.openPopup("terminalPopup", "Looks like you need to restart the system to finish your mission!", [
                    {
                        label: 'RESTART',
                        className: 'primary',
                        callback: () => restartPower(),
                    }
                ])
            }
        } else {
            currentPopup = WA.ui.openPopup("terminalPopup", "This is the terminal... but it is out of service.", [])
        }
    })
    WA.room.area.onLeave("terminal").subscribe(() => {
        closeEverything()
    })    

    // The line below bootstraps the Scripting API Extra library that adds a number of advanced properties/features to WorkAdventure
    bootstrapExtra().then(() => {
        console.log('Scripting API Extra ready');

        const GameStarted = WA.state.onVariableChange('GameStarted').subscribe((value) => {
            if (value === true) {
                WA.ui.website.open(information)
                GameStarted.unsubscribe()
                closePopup()
                WA.controls.restorePlayerControls()
            }
        })

        WA.state.onVariableChange('TicTacToeComplete').subscribe((value) => {
            if (value === true) {
                WA.state.QuestionReady = WA.state.CigaretteComplete 
            }
        })
        WA.state.onVariableChange('CigaretteComplete').subscribe((value) => {
            if (value === true) {
                WA.state.QuestionReady = WA.state.TicTacToeComplete 
            }
        })

        if (WA.state.GameStarted === false) {
            WA.controls.disablePlayerControls()
            currentPopup = WA.ui.openPopup("startPopup", "You have just landed in an abandoned train station. By clicking on ESCAPE the 20 minutes timer will start.", [
                {
                    label: 'ESCAPE',
                    className: 'error',
                    callback: () => {
                        WA.state.GameStarted = true
                        closePopup()
                        WA.controls.restorePlayerControls()
                    },
                }
            ])
        } else {
            WA.ui.website.open(information)
        }
    }).catch(e => console.error(e));

}).catch(e => console.error(e));

function closePopup(){
    if (currentPopup !== undefined) {
        currentPopup.close();
        currentPopup = undefined;
    }
}

async function closeEverything(){
    closePopup()

    const websites = await WA.nav.getCoWebSites()
    if (websites.length) {
        WA.nav.closeCoWebSite()
    }
}

function giveClue(roomNumber: number){
    let variableName = ""
    for (let i = 1; i < 4; i++) {
        variableName = `Room${roomNumber}Clue${i}`
        // If the next clue has not been shown: show it
        if (WA.state.loadVariable(variableName) === false) {
            WA.state.saveVariable(variableName, true)
            return
        }
    }
}

function restartPower(){
    closePopup()
    WA.state.powerRestarted = true
    WA.nav.openCoWebSite(WA.state.formURL as string)
}

export {};
