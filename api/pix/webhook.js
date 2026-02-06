const { WEBHOOK_TOKEN } = require('../../lib/ativus');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ status: 'method_not_allowed' });
        return;
    }
    const token = req.query?.token;
    if (token !== WEBHOOK_TOKEN) {
        res.status(401).json({ status: 'unauthorized' });
        return;
    }
    res.status(200).json({ status: 'success' });
};
