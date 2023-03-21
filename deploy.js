const FtpDeploy = require("ftp-deploy");
const ftpDeploy = new FtpDeploy();

const config = {
    user: "u149889p141504",
    // Password optional, prompted if none given
    password: "",
    host: "web0150.zxcs.nl",
    port: 21,
    localRoot: __dirname,
    remoteRoot: "/domains/luukpohlmann.nl/xref-ui",
    // include: ["*", "**/*"],      // this would upload everything except dot files
    include: ["dist/**"],
    // e.g. exclude sourcemaps, and ALL files in node_modules (including dot files)
    exclude: ["dist/test/**"],
    // delete ALL existing files at destination before uploading, if true
    deleteRemote: true,
    // Passive mode is forced (EPSV command is not sent)
    forcePasv: true,
    // use sftp or ftp
    sftp: false,
};

ftpDeploy
    .deploy(config)
    .then((res) => console.log("finished:", res))
    .catch((err) => console.log(err));