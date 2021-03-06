const getBalance = require('./getBalance');
const updateBalance = require('./updateBalance');

module.exports = function (userId, reduceAmount) {
    return (new Promise(function (resolve, reject) {
        getBalance(userId).then((balance) => {
            // calculate new balance
            const newBalance = balance - reduceAmount;
            // update balance
            if (newBalance < 0) {
                reject("You don't have enough money");
                return;
            }
            updateBalance(userId, newBalance).then(result => {
                resolve(result);
            }).catch((error) => { reject(error) });
        }).catch((error) => {
            reject(error);
        });
    }))
}