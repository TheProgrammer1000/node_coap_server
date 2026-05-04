-- V4__rename_device_add_serialnumber_and_update_procedures.sql

-- 1. Byt namn på gamla device-tabellen
RENAME TABLE device TO device_user;

-- 2. Skapa tabell för serienummer
CREATE TABLE device_serienumber (
    device_ID BIGINT NOT NULL,
    device_serienumber VARCHAR(255) NOT NULL,
    PRIMARY KEY (device_ID),
    UNIQUE KEY unique_device_serienumber (device_serienumber)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Lägg in tillåtna serienummer
INSERT INTO device_serienumber(device_ID, device_serienumber)
VALUES 
    (123456, 'A1F453B5'),
    (456789, 'B2S752T2');

-- 4. Uppdatera get_deviceID_by_userID
DROP PROCEDURE IF EXISTS get_deviceID_by_userID;

DELIMITER $$

CREATE PROCEDURE get_deviceID_by_userID(
    IN p_user_ID INT
)
BEGIN
    SELECT a.device_ID
    FROM device_user a
    WHERE a.user_ID = p_user_ID
    LIMIT 1;
END$$

DELIMITER ;

-- 5. Uppdatera get_gnss_data_by_user_deviceID
DROP PROCEDURE IF EXISTS get_gnss_data_by_user_deviceID;

DELIMITER $$

CREATE PROCEDURE get_gnss_data_by_user_deviceID(
    IN p_device_ID BIGINT
)
BEGIN
    SELECT 
        b.lat,
        b.lon,
        b.acc,
        b.data_timestamp
    FROM device_user a
    INNER JOIN device_gnss_data b
        ON a.device_ID = b.device_ID
    WHERE a.device_ID = p_device_ID;
END$$

DELIMITER ;

-- 6. Uppdatera get_gnss_user_device
DROP PROCEDURE IF EXISTS get_gnss_user_device;

DELIMITER $$

CREATE PROCEDURE get_gnss_user_device(
    IN p_device_ID BIGINT
)
BEGIN
    SELECT 
        b.lat,
        b.lon,
        b.acc,
        b.data_timestamp
    FROM device_user a
    INNER JOIN device_gnss_data b
        ON a.device_ID = b.device_ID
    WHERE a.device_ID = p_device_ID;
END$$

DELIMITER ;

-- 7. Skapa add_new_device
DROP PROCEDURE IF EXISTS add_new_device;

DELIMITER $$

CREATE PROCEDURE add_new_device(
    IN p_user_ID INT,
    IN p_device_name VARCHAR(255),
    IN p_serienumber VARCHAR(255)
)
BEGIN
    DECLARE is_available INT DEFAULT 0;
    DECLARE v_device_ID BIGINT DEFAULT NULL;

    SELECT EXISTS(
        SELECT 1
        FROM device_serienumber a
        WHERE a.device_serienumber = p_serienumber
          AND NOT EXISTS (
              SELECT 1
              FROM device_user b
              WHERE b.device_ID = a.device_ID
          )
    ) INTO is_available;

    IF is_available = 1 THEN

        SELECT a.device_ID
        INTO v_device_ID
        FROM device_serienumber a
        WHERE a.device_serienumber = p_serienumber
        LIMIT 1;

        INSERT INTO device_user(device_ID, user_ID, device_name)
        VALUES(v_device_ID, p_user_ID, p_device_name);

        SELECT 
            1 AS success,
            v_device_ID AS device_ID,
            'Device added' AS message;

    ELSE

        SELECT 
            0 AS success,
            NULL AS device_ID,
            'Device not available or serial number does not exist' AS message;

    END IF;
END$$

DELIMITER ;