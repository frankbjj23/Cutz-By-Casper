-- Match the exact display names and review metadata currently shown by Booksy.

update public.published_reviews
set display_name = 'Mauricio',
    review_text = 'Super sharp cut today.',
    service_name = 'HAIRCUT NO BEARD',
    updated_at = now()
where source_key = 'booksy-mauricio-sharp-cut';

update public.published_reviews
set display_name = 'Danny',
    review_text = 'A man of his craft, never disappoints!',
    service_name = 'Gentlemen haircut/ shape up',
    updated_at = now()
where source_key = 'booksy-danny-craft';

update public.published_reviews
set display_name = 'David',
    review_text = 'HANDS DOWN THE BEST BARBER IN JERSEY',
    service_name = 'HAIRCUT NO BEARD',
    updated_at = now()
where source_key = 'booksy-david-best-in-jersey';
