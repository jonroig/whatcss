CREATE TABLE screenshots (
 id integer PRIMARY KEY,
 dateTS DATETIME DEFAULT CURRENT_TIMESTAMP,
 thePage text NOT NULL,
 pngData text NOT NULL,
 originalSize int NOT NULL,
 newSize int NOT NULL
 );
