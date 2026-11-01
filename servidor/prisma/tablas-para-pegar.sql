CREATE TABLE `Usuario` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passHash` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `rol` VARCHAR(191) NOT NULL,
    `roles` JSON NOT NULL,
    `plan` VARCHAR(191) NOT NULL DEFAULT 'origen',
    `visibilidad` VARCHAR(191) NOT NULL DEFAULT 'publico',
    `provincia` VARCHAR(191) NOT NULL DEFAULT '',
    `telefono` VARCHAR(191) NOT NULL DEFAULT '',
    `whatsapp` VARCHAR(191) NOT NULL DEFAULT '',
    `cedulaCifrada` VARCHAR(191) NOT NULL DEFAULT '',
    `cedulaHuella` VARCHAR(191) NOT NULL DEFAULT '',
    `verificado` BOOLEAN NOT NULL DEFAULT false,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'activo',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `admin` BOOLEAN NOT NULL DEFAULT false,
    `fundador` BOOLEAN NOT NULL DEFAULT false,
    `dosFactores` BOOLEAN NOT NULL DEFAULT false,
    `dosFactoresEn` DATETIME(3) NULL,
    `passCambiadaEn` DATETIME(3) NULL,
    `extra` JSON NOT NULL,
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Usuario_email_key`(`email`),
    INDEX `Usuario_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

CREATE TABLE `Sesion` (
    `tokenHash` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `admin` BOOLEAN NOT NULL DEFAULT false,
    `adminDesde` DATETIME(3) NULL,
    `pendiente2fa` VARCHAR(191) NULL,
    `recordar` BOOLEAN NOT NULL DEFAULT false,
    `inicio` DATETIME(3) NULL,
    `datos` JSON NOT NULL,
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expira` DATETIME(3) NOT NULL,

    INDEX `Sesion_usuarioId_idx`(`usuarioId`),
    INDEX `Sesion_expira_idx`(`expira`),
    PRIMARY KEY (`tokenHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

CREATE TABLE `CodigoRespaldo` (
    `id` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `hash` VARCHAR(191) NOT NULL,
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CodigoRespaldo_usuarioId_idx`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

CREATE TABLE `Otp` (
    `id` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `proposito` VARCHAR(191) NOT NULL,
    `hash` VARCHAR(191) NOT NULL,
    `fallos` INTEGER NOT NULL DEFAULT 0,
    `expira` DATETIME(3) NOT NULL,
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Otp_usuarioId_proposito_key`(`usuarioId`, `proposito`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

CREATE TABLE `RecuperacionPass` (
    `id` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expira` DATETIME(3) NOT NULL,
    `ip` VARCHAR(191) NOT NULL DEFAULT '',
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RecuperacionPass_tokenHash_key`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

CREATE TABLE `Consentimiento` (
    `id` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(191) NOT NULL,
    `ua` VARCHAR(255) NOT NULL,
    `terminos` BOOLEAN NOT NULL,
    `privacidad` BOOLEAN NOT NULL,
    `usoDatos` BOOLEAN NOT NULL,
    `marketing` BOOLEAN NOT NULL,
    `version` VARCHAR(191) NOT NULL DEFAULT 'v1',
    `ts` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Consentimiento_usuarioId_idx`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

CREATE TABLE `Administrador` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'principal',
    `passHash` VARCHAR(191) NOT NULL,
    `provisionalHasta` DATETIME(3) NULL,
    `resetTokenHash` VARCHAR(191) NULL,
    `resetExpira` DATETIME(3) NULL,
    `actualizado` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

CREATE TABLE `Intento` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `clave` VARCHAR(191) NOT NULL,
    `ts` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Intento_clave_ts_idx`(`clave`, `ts`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

CREATE TABLE `Documento` (
    `coleccion` VARCHAR(64) NOT NULL,
    `id` VARCHAR(191) NOT NULL,
    `orden` BIGINT NOT NULL AUTO_INCREMENT,
    `datos` JSON NOT NULL,
    `creado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Documento_orden_key`(`orden`),
    INDEX `Documento_coleccion_orden_idx`(`coleccion`, `orden`),
    PRIMARY KEY (`coleccion`, `id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

CREATE TABLE `Secreto` (
    `nombre` VARCHAR(64) NOT NULL,
    `valor` TEXT NOT NULL,

    PRIMARY KEY (`nombre`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

CREATE TABLE `RegistroImportacion` (
    `id` VARCHAR(191) NOT NULL,
    `origen` VARCHAR(191) NOT NULL,
    `legacyId` VARCHAR(191) NOT NULL,
    `destino` VARCHAR(191) NOT NULL,
    `destinoId` VARCHAR(191) NOT NULL,
    `ts` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RegistroImportacion_origen_legacyId_key`(`origen`, `legacyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

CREATE TABLE `Candado` (
    `nombre` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`nombre`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

ALTER TABLE `Sesion` ADD CONSTRAINT `Sesion_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `CodigoRespaldo` ADD CONSTRAINT `CodigoRespaldo_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Otp` ADD CONSTRAINT `Otp_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `RecuperacionPass` ADD CONSTRAINT `RecuperacionPass_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
