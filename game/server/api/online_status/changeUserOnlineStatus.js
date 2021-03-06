const { httpPost } = require('../request');
const getServerToken = require('../server_token/getServerToken');

// Change online status, true = online, false = offline
module.exports = function (user_id, online_status) {
    const server_token = getServerToken();

    return (new Promise(function (resolve, reject) {
        httpPost(process.env.SPACE_CITIZEN_API_URL + '/api/users/change_online_status',
            { user_id: user_id, online_status: online_status }, server_token).then((response) => {
                if (!response || !response.body) {
                    reject("Response body not found");
                    return;
                }
                resolve(response.body);
            }).catch((error) => {
                reject(error);
            });
    }));
}