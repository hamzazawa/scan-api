// إعدادات فايربيز الخاصة بك
const firebaseConfig = {
    databaseURL: "https://hamza-kr-default-rtdb.firebaseio.com"
};

// تهيئة فايربيز
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const gameRef = db.ref('game_room');

// قائمة اللاعبين العشوائيين للتجربة
const playersDB = [
    { name: "كورتوا", pos: "حارس" }, { name: "أليسون", pos: "حارس" },
    { name: "راموس", pos: "دفاع" }, { name: "فان دايك", pos: "دفاع" }, { name: "دياز", pos: "دفاع" }, { name: "ماركينيوس", pos: "دفاع" },
    { name: "دي بروين", pos: "وسط" }, { name: "مودريتش", pos: "وسط" }, { name: "بيدري", pos: "وسط" }, { name: "كروس", pos: "وسط" },
    { name: "مبابي", pos: "هجوم" }, { name: "هالاند", pos: "هجوم" }, { name: "ميسي", pos: "هجوم" }
];

let myRole = null; // 'player1' أو 'player2'

// دالة الانضمام للغرفة
function joinGame(role) {
    myRole = role;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'flex';
    
    if(myRole === 'player1') {
        document.getElementById('you-p1').innerText = "(أنت)";
        document.getElementById('btn-next').style.display = 'inline-block'; // اللاعب الأول هو من يطرح اللاعبين
    } else {
        document.getElementById('you-p2').innerText = "(أنت)";
    }

    listenToGame();
}

// دالة الاستماع للتحديثات اللحظية من فايربيز
function listenToGame() {
    gameRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // تحديث اللاعب الأول
        document.getElementById('budget-p1').innerText = data.player1.budget;
        updateTeamUI('team-p1', data.player1.team);

        // تحديث اللاعب الثاني
        document.getElementById('budget-p2').innerText = data.player2.budget;
        updateTeamUI('team-p2', data.player2.team);

        // تحديث المزاد
        if (data.auction.currentPlayer) {
            document.getElementById('card-name').innerText = data.auction.currentPlayer.name;
            document.getElementById('card-pos').innerText = data.auction.currentPlayer.pos;
            document.getElementById('current-bid').innerText = data.auction.currentBid;
            
            let bidderName = data.auction.highestBidder === 'player1' ? 'اللاعب الأول' : 
                             (data.auction.highestBidder === 'player2' ? 'اللاعب الثاني' : 'لا أحد');
            document.getElementById('highest-bidder').innerText = bidderName;
        } else {
            document.getElementById('card-name').innerText = "لا يوجد لاعب معروض";
            document.getElementById('card-pos').innerText = "-";
            document.getElementById('current-bid').innerText = "0";
            document.getElementById('highest-bidder').innerText = "لا أحد";
        }
    }, (error) => {
        console.error("Firebase Read Error: ", error);
    });
}

// تحديث واجهة التشكيلة
function updateTeamUI(elementId, teamObj) {
    const ul = document.getElementById(elementId);
    ul.innerHTML = '';
    if (teamObj) {
        Object.values(teamObj).forEach(player => {
            let li = document.createElement('li');
            li.innerText = `${player.name} (${player.pos}) - ${player.price} مليون`;
            ul.appendChild(li);
        });
    }
}

// دالة المزايدة
function placeBid() {
    gameRef.once('value').then((snapshot) => {
        const data = snapshot.val();
        if (!data || !data.auction.currentPlayer) return alert("لا يوجد لاعب في المزاد حالياً");

        let myBudget = data[myRole].budget;
        let newBid = data.auction.currentBid + 1;

        if (myBudget >= newBid) {
            // تحديث المزاد في القاعدة
            gameRef.child('auction').update({
                currentBid: newBid,
                highestBidder: myRole
            }).catch(error => console.error("Update Bid Error: ", error));
        } else {
            alert("ميزانيتك لا تكفي للمزايدة!");
        }
    }).catch(error => console.error("Read Once Error: ", error));
}

// دالة طرح لاعب جديد وإنهاء المزاد السابق (يتحكم بها اللاعب الأول)
function nextPlayer() {
    gameRef.once('value').then((snapshot) => {
        const data = snapshot.val();
        
        // إذا كان هناك لاعب سابق وعليه مزايدة، نقوم ببيعه للمزايد الأعلى
        if (data && data.auction.currentPlayer && data.auction.highestBidder !== 'none') {
            let winner = data.auction.highestBidder;
            let price = data.auction.currentBid;
            let boughtPlayer = data.auction.currentPlayer;
            boughtPlayer.price = price;

            // خصم الميزانية وإضافة اللاعب
            let newBudget = data[winner].budget - price;
            gameRef.child(winner + '/team').push(boughtPlayer);
            gameRef.child(winner).update({ budget: newBudget });
        }

        // سحب لاعب عشوائي جديد
        let randomPlayer = playersDB[Math.floor(Math.random() * playersDB.length)];

        // طرحه في المزاد
        gameRef.child('auction').set({
            currentPlayer: randomPlayer,
            currentBid: 0,
            highestBidder: 'none'
        }).catch(error => console.error("Set New Player Error: ", error));

    }).catch(error => console.error("Next Player Read Error: ", error));
}

// دالة لتهيئة اللعبة من الصفر
function resetGame() {
    const initialState = {
        player1: { budget: 120, team: '' },
        player2: { budget: 120, team: '' },
        auction: { currentBid: 0, highestBidder: 'none', currentPlayer: '' }
    };
    gameRef.set(initialState)
        .then(() => alert("تم تصفير اللعبة بنجاح!"))
        .catch(error => console.error("Reset Game Error: ", error));
}
