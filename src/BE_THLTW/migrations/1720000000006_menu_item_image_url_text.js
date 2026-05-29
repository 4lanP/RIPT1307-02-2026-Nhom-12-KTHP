exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.alterColumn('MENU_ITEMS', 'image_url', { type: 'text' });
};

exports.down = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM "MENU_ITEMS"
        WHERE image_url IS NOT NULL AND length(image_url) > 500
      ) THEN
        RAISE EXCEPTION 'Cannot rollback MENU_ITEMS.image_url to varchar(500) while values longer than 500 characters exist';
      END IF;
    END $$;
  `);
  pgm.alterColumn('MENU_ITEMS', 'image_url', { type: 'varchar(500)' });
};
