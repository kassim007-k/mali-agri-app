# Mise en service des données Mali Agri

L’application utilise les tables `agri_` de Supabase pour le catalogue, les leçons, les inscriptions, le profil et la progression. La migration n’est pas exécutée automatiquement depuis l’application.

## Appliquer le schéma

1. Ouvrez le projet Supabase utilisé par l’application, puis son **SQL Editor**.
2. Exécutez `migrations/20261005000000_agri_learning.sql`, puis `migrations/20261005000001_agri_course_languages_media.sql`, dans cet ordre.
3. Vérifiez que les tables `agri_profiles`, `agri_courses`, `agri_lessons`, `agri_enrollments` et `agri_lesson_progress` existent.
4. La seconde migration ajoute la langue et le format des leçons, des cours exemples en français et bambara, et la gestion sécurisée des rôles. Les insertions de cours sont idempotentes.

La migration crée les profils pour les comptes Supabase Auth déjà présents et un profil `user` à chaque nouvelle inscription. Elle ne supprime ni ne modifie les tables déjà utilisées par le projet.

## Désigner le premier administrateur

Créez d’abord le compte de Boulkassoum Keïta avec son numéro exact, puis identifiez ce compte sans vous fier uniquement au nom affiché. Dans **Authentication → Users**, vérifiez son téléphone et copiez son UUID. Dans le SQL Editor, remplacez l’UUID d’exemple et exécutez :

```sql
update public.agri_profiles
set role = 'admin'
where id = 'REMPLACER-PAR-UUID-DU-COMPTE';
```

Le premier administrateur doit être désigné depuis le SQL Editor. Ensuite, un administrateur peut modifier les noms et gérer les rôles dans **Espace administration**. Une fonction protégée refuse les appels non-admin et empêche de rétrograder le dernier administrateur. L’application n’a pas accès aux clés Supabase d’administration et ne peut pas supprimer/désactiver des utilisateurs Auth.

Les numéros maliens saisis sur 8 chiffres sont normalisés en `+223`; les numéros d’autres pays doivent inclure leur indicatif international. Si la confirmation de téléphone est activée, l’application demande le code SMS. Dans Supabase, activez l’authentification par téléphone et configurez un fournisseur SMS avant de tester cette confirmation; les SMS peuvent être facturés et doivent respecter les limites/règles du fournisseur.

## Configuration client

L’application ne doit contenir que l’URL du projet et sa clé publique (`anon`/publishable) dans les variables `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Ne mettez jamais une clé `service_role` dans l’application mobile ou dans une variable `EXPO_PUBLIC_*`.

La migration bilingue ajoute quatre cours de départ (fertilité du sol et engraissement des petits ruminants, en français et bambara), avec leçons écrites et pages de ressources vidéo/audio d’Access Agriculture. Ces médias restent hébergés chez leur éditeur et s’ouvrent dans le navigateur; aucun fichier média n’est copié dans l’application. Un administrateur peut créer et modifier les cours/leçons, choisir langue et format, puis publier/retirer un cours. Pour les nouveaux médias, fournissez un lien HTTPS accessible aux apprenants. Les membres peuvent s’inscrire aux cours publiés et leur progression se met à jour sur le tableau de bord.

Les résumés bambara de démarrage sont volontairement courts; faites-les relire par un locuteur/une locutrice Bamanankan et par le service technique compétent avant d’ajouter des consignes locales précises.
