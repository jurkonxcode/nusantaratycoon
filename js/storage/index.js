/* Memilih driver penyimpanan sesuai NT.config.storage. */
(function (NT) {
  NT.getStorage = function () {
    const driver = NT.storageDrivers[NT.config.storage];
    if (!driver) throw new Error('Driver penyimpanan tidak dikenal: ' + NT.config.storage);
    return driver;
  };
})((window.NT = window.NT || {}));
