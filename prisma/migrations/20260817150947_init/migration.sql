-- CreateTable
CREATE TABLE `empresas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(200) NOT NULL,
    `cnpj` VARCHAR(18) NULL,
    `ativa` BOOLEAN NOT NULL DEFAULT true,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `empresas_cnpj_key`(`cnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(20) NOT NULL,
    `nome` VARCHAR(200) NOT NULL,
    `tipo` VARCHAR(10) NOT NULL,
    `natureza` VARCHAR(10) NOT NULL,
    `nivel` INTEGER NOT NULL,
    `grupo` VARCHAR(30) NOT NULL,
    `ativa` BOOLEAN NOT NULL DEFAULT true,
    `conta_pai_id` INTEGER NULL,
    `empresa_id` INTEGER NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    INDEX `contas_empresa_id_idx`(`empresa_id`),
    INDEX `contas_conta_pai_id_idx`(`conta_pai_id`),
    UNIQUE INDEX `contas_codigo_empresa_id_key`(`codigo`, `empresa_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `contas` ADD CONSTRAINT `contas_conta_pai_id_fkey` FOREIGN KEY (`conta_pai_id`) REFERENCES `contas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contas` ADD CONSTRAINT `contas_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
