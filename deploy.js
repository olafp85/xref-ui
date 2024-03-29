const FtpDeploy = require("ftp-deploy");
const ftpDeploy = new FtpDeploy();

const config = {
    user: "u149889p141504",
    password: "",  // Password optional, prompted if none given
    host: "web0150.zxcs.nl",
    port: 21,
    remoteRoot: "/domains/luukpohlmann.nl/xref-ui",
    localRoot: __dirname,
    include: ["dist/**"],
    exclude: ["dist/test/**"],
    deleteRemote: true,
    forcePasv: true,
    sftp: false,
};

ftpDeploy.on("uploading", (data) => {
    console.log("Uploading", data.filename);
});

ftpDeploy
    .deploy(config)
    .catch((error) => console.log(error));