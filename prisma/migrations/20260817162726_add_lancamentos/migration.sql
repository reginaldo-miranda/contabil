-- CreateTable
CREATE TABLE `lancamentos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `data` DATE NOT NULL,
    `valor` DECIMAL(15, 2) NOT NULL,
    `historico` TEXT NOT NULL,
    `conta_debito_id` INTEGER NOT NULL,
    `conta_credito_id` INTEGER NOT NULL,
    `empresa_id` INTEGER NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL,

    INDEX `lancamentos_empresa_id_idx`(`empresa_id`),
    INDEX `lancamentos_conta_debito_id_idx`(`conta_debito_id`),
    INDEX `lancamentos_conta_credito_id_idx`(`conta_credito_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lancamentos` ADD CONSTRAINT `lancamentos_conta_debito_id_fkey` FOREIGN KEY (`conta_debito_id`) REFERENCES `contas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lancamentos` ADD CONSTRAINT `lancamentos_conta_credito_id_fkey` FOREIGN KEY (`conta_credito_id`) REFERENCES `contas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lancamentos` ADD CONSTRAINT `lancamentos_empresa_id_fkey` FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
