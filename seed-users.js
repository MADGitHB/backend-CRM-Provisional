import bcrypt from 'bcryptjs';
import pool from './db.js';
import dotenv from 'dotenv';
dotenv.config();

const usuarios = [
  { nombre: 'Geovanny Paul Guevara Morales',          ci: '0704670686',  role: 'admin' },
  { nombre: 'Kenneth Adrian Taipe Garcia',             ci: '1724994973',  role: 'admin' },
  { nombre: 'Alexandra Karina Vinueza Esmeraldas',     ci: '1204103756',  role: 'vendedor' },
  { nombre: 'Mery Jessica Suarez Yagual',              ci: '0924545239',  role: 'vendedor' },
  { nombre: 'Eduardo Gaspar Reyes Clemente',           ci: '0922540539',  role: 'vendedor' },
  { nombre: 'Francisco Johnny Figueroa Piguave',       ci: '0918248493',  role: 'vendedor' },
  { nombre: 'Carlos Alberto Rodriguez Rivas',          ci: '0926256959',  role: 'vendedor' },
  { nombre: 'Elizabeth del Rocío Matamoros Guzmán',   ci: '2200499032',  role: 'vendedor' },
  { nombre: 'Katheryn Brigith Ruiz Quezada',           ci: '1150487013',  role: 'vendedor' },
  { nombre: 'Carolina María Montalban Loor',           ci: '2450025909',  role: 'vendedor' },
  { nombre: 'Mercedes Stefania Cevallos Saltos',       ci: '0925913956',  role: 'vendedor' },
  { nombre: 'Erika Dallely Bermudez Salinas',          ci: '2150195226',  role: 'vendedor' },
  { nombre: 'Kiara Anais Jiménez Cadena',              ci: '1755882428',  role: 'vendedor' },
  { nombre: 'Marcia Eugenia Mancero Caimito',          ci: '2100215249',  role: 'vendedor' },
  { nombre: 'Adalixe Katherine Pacheco Fajardo',       ci: '1205811654',  role: 'vendedor' },
  { nombre: 'Alvaro Luis Flores Malave',               ci: '0925726390',  role: 'vendedor' },
  { nombre: 'Fanny Margarita Anchundia Pico',          ci: '1307802007',  role: 'vendedor' },
  { nombre: 'Martha María Marin Gómez',                ci: '0919167577',  role: 'vendedor' },
  { nombre: 'Sandra Karina Mamallacta Huatatoca',      ci: '1501131765',  role: 'vendedor' },
  { nombre: 'Oriana Nahomi Palma Marin',               ci: '0957811979',  role: 'vendedor' },
  { nombre: 'David Sebastián Revelo También',          ci: '0402104491',  role: 'vendedor' },
  { nombre: 'Estela Sugey Moya Cardenas',              ci: '0801991928',  role: 'vendedor' },
  { nombre: 'María Paulina Carrión Pacheco',           ci: '1103401673',  role: 'vendedor' },
  { nombre: 'Yadira Alexandra Espinoza Jirón',         ci: '1900838929',  role: 'vendedor' },
  { nombre: 'María Zoraida Pérez Tituaña',             ci: '1710990951',  role: 'vendedor' },
  { nombre: 'Mayra Nathaly Figueroa Merino',           ci: '0925664807',  role: 'vendedor' },
  { nombre: 'Édgar Roberto Rosales Ordóñez',           ci: '2450416058',  role: 'vendedor' },
  { nombre: 'Liliana Suarez',                          ci: '0930353974',  role: 'vendedor' },
  { nombre: 'Jessica Jomayra Angulo Ramirez',          ci: '0802314724',  role: 'vendedor' },
  { nombre: 'Angie Lissette Malave Suárez',            ci: '2400008427',  role: 'vendedor' },
  { nombre: 'Blanca Georgina López Cercado',           ci: '0921372330',  role: 'vendedor' },
  { nombre: 'Maria Auxiliadora Garcés García',         ci: '0921909982',  role: 'vendedor' },
  { nombre: 'Haydee Lourdes Palacios Sánchez',         ci: '1250025317',  role: 'vendedor' },
  { nombre: 'Carlos Eduardo Bustos Drouet',            ci: '0927865808',  role: 'vendedor' },
  { nombre: 'Cristhian Edinson Tomalá Lino',           ci: '2450337726',  role: 'vendedor' },
  { nombre: 'Henry Xavier Soliz Zarama',               ci: '0923536775',  role: 'vendedor' },
  { nombre: 'Katty Michelle Ramírez Guaranda',         ci: '2400109746',  role: 'vendedor' },
  { nombre: 'Francisco Manuel Soriano Panchana',       ci: '0919790949',  role: 'vendedor' },
  { nombre: 'Segundo Alex Del Pezo Yagual',            ci: '0928146125',  role: 'vendedor' },
  { nombre: 'Marco Vinicio Chancusi Vega',             ci: '0503496168',  role: 'vendedor' },
  { nombre: 'Yajaira Vizcaíno',                        ci: '0401737556',  role: 'vendedor' },
  { nombre: 'Jhoon Li Salvador Peñafiel',              ci: '0504254780',  role: 'vendedor' },
  { nombre: 'Richard Steeven Lozada Medina',           ci: '0550325104',  role: 'vendedor' },
  { nombre: 'Jessenia Gabriela Muñoz Vera',            ci: '1207046150',  role: 'vendedor' },
  { nombre: 'Oscar Ernesto Velez Veliz',               ci: '1351734494',  role: 'vendedor' },
  { nombre: 'Maria Victoria Garcia Pinargote',         ci: '1310430036',  role: 'vendedor' },
  { nombre: 'Cristhian Javier Narvaez Mena',           ci: '0704287077',  role: 'vendedor' },
  { nombre: 'Luz Irene Parco Baños',                   ci: '1717976193',  role: 'vendedor' },
  { nombre: 'Lainer Gabriel Mendoza Loor',             ci: '2400166647',  role: 'vendedor' },
  { nombre: 'Diana del Rocio Cueva Vaca',              ci: '1718868951',  role: 'vendedor' },
  { nombre: 'Juan Moises Almeida Endara',              ci: '1753519907',  role: 'vendedor' },
  { nombre: 'Fernando Javier Merino Viteri',           ci: '0915369177',  role: 'vendedor' },
  { nombre: 'Jose Luis Moreno Cobo',                   ci: '0602908139',  role: 'vendedor' },
  { nombre: 'Lesly Lourdes Tomala Nieto',              ci: '2400035545',  role: 'vendedor' },
  { nombre: 'Carlos Gregorio Ortega Guerrero',         ci: '1316051992',  role: 'vendedor' },
  { nombre: 'Gisselly Janeth Neira Saldarriaga',       ci: '0704337799',  role: 'vendedor' },
  { nombre: 'Silver Fernando Cherrez Chávez',          ci: '1350331516',  role: 'vendedor' },
  { nombre: 'Corinthya Esmeralda Abarca Hidalgo',      ci: '1803108859',  role: 'vendedor' },
  { nombre: 'Wilmer Jonathan Gonzabay Gonzabay',       ci: '0926914797',  role: 'vendedor' },
  { nombre: 'Max Fabricio Santana Mata',               ci: '2450681917',  role: 'vendedor' },
  { nombre: 'Carla Fernanda Naranjo Aguilar',          ci: '0201822210',  role: 'vendedor' },
  { nombre: 'Gustavo Alexander Toabanda Aragon',       ci: '0202697348',  role: 'vendedor' },
  { nombre: 'Kevin Gabriel Quijije Vega',              ci: '2350511487',  role: 'vendedor' },
  { nombre: 'Edison Xavier Bravo Lasso',               ci: '1715231385',  role: 'vendedor' },
  { nombre: 'Victor Sanchez',                          ci: '1723235337',  role: 'vendedor' },
  { nombre: 'Franklin Adrian Morales Vaca',            ci: '1711159945',  role: 'vendedor' },
  { nombre: 'Natalia Jimena Alvia Huertas',            ci: '0501657795',  role: 'vendedor' },
  { nombre: 'Laura Edith Llamoca Pasuy',               ci: '1600465577',  role: 'vendedor' },
  { nombre: 'Ceila Gislaine Balladares Alvarez',       ci: '0908926157',  role: 'vendedor' },
  { nombre: 'Rommel Vinicio Avila Quillay',            ci: '1003024849',  role: 'vendedor' },
  { nombre: 'Estefy Reyna',                            ci: '0943494542',  role: 'vendedor' },
  { nombre: 'Raúl Andrés Andrade Chica',               ci: '0850051202',  role: 'vendedor' },
  { nombre: 'Angie Nicole Bastidas Lugmaña',           ci: '0401709746',  role: 'vendedor' },
  { nombre: 'Lourdes del Pilar Davila Rosero',         ci: '0401002118',  role: 'vendedor' },
  { nombre: 'Walter Palermo Jiménez Chamba',           ci: '1102783030',  role: 'vendedor' },
  { nombre: 'Iván Andrés Baquerizo Malave',            ci: '0922699533',  role: 'vendedor' },
  { nombre: 'Raul Estalin Jurado Lopez',               ci: '1801759240',  role: 'vendedor' },
  { nombre: 'Roberto Patricio López Freire',           ci: '180-216-1073', role: 'vendedor' },
  { nombre: 'Orfe Honorio Jiménez Jiménez',            ci: '1708448392',  role: 'vendedor' },
  { nombre: 'Brian Andres Jimenez Cadena',             ci: '1718231556',  role: 'vendedor' },
  { nombre: 'Sofia Fernanda Moyano Aguirre',           ci: '0940800527',  role: 'vendedor' },
  { nombre: 'Alba Patricia Suárez Vera',               ci: '0927367623',  role: 'vendedor' },
  { nombre: 'Jorge Eduardo Almeida Cadena',            ci: '1705603528',  role: 'vendedor' },
  { nombre: 'Esthela Tatiana Narvaez Flores',          ci: '1105203531',  role: 'vendedor' },
  { nombre: 'Xavier Mauricio Rivera Salvador',         ci: '1713239620',  role: 'vendedor' },
  { nombre: 'Sandra Jacqueline Romero Ibañez',         ci: '1203831159',  role: 'vendedor' },
  { nombre: 'Victoria Isabel Moreno Reina',            ci: '0908737612',  role: 'vendedor' },
  { nombre: 'Xavier Alcides López Altamirano',         ci: '1706389101',  role: 'vendedor' },
  { nombre: 'Monica Guadalupe Tapia Paucar',           ci: '0401198460',  role: 'vendedor' },
  { nombre: 'Bryan Edmundo Guale Loor',                ci: '2450128521',  role: 'vendedor' },
  { nombre: 'Fernando Miguel Avilés Mancero',          ci: '0602528994',  role: 'vendedor' },
  { nombre: 'Elsa Denises Mina Bonilla',               ci: '0923592620',  role: 'vendedor' },
  { nombre: 'Franco Fernando Pacheco Pazuña',          ci: '0503172009',  role: 'vendedor' },
  { nombre: 'Jose Francisco García Cevallos',          ci: '1305397752',  role: 'vendedor' },
  { nombre: 'Carlos Diego Chicala Fares',              ci: '0705322444',  role: 'vendedor' },
  { nombre: 'Neiva Marily Mendoza Loor',               ci: '1350580492',  role: 'vendedor' },
  { nombre: 'Robinson Hitler Macías Pico',             ci: '1313785873',  role: 'vendedor' },
  { nombre: 'María Monserrate Zambrano Vera',          ci: '1717077729',  role: 'vendedor' },
  { nombre: 'Byron Patricio Chale Lemache',            ci: '1724213143',  role: 'vendedor' },
  { nombre: 'Yessenia Tamara Abarca Hidalgo',          ci: '1802903011',  role: 'vendedor' },
  { nombre: 'Juan Carlos Trujillo Cabrera',            ci: '1713073003',  role: 'vendedor' },
  { nombre: 'Erik Michael Luzuriaga León',             ci: '1104308067',  role: 'vendedor' },
  { nombre: 'Jonathan Israel Citelly Sevilla',         ci: '1805202957',  role: 'vendedor' },
  { nombre: 'Carlos Iván Bermeo Remache',              ci: '1804342903',  role: 'vendedor' },
  { nombre: 'Orlando Rafael Samaniego Yanangomez',     ci: '1804243895',  role: 'vendedor' },
  { nombre: 'Mauricio Alfonso Chavez Borja',           ci: '0202102745',  role: 'vendedor' },
  { nombre: 'Alejandro Santiago Jumbo Salazar',        ci: '1715062855',  role: 'vendedor' },
  { nombre: 'Alex Alberto Jerez Lucas',                ci: '0801979618',  role: 'vendedor' },
  { nombre: 'Luis Cristobal Guerra Leon',              ci: '0602886715',  role: 'vendedor' },
  { nombre: 'Lorena Carolina Navas Leon',              ci: '1804509246',  role: 'vendedor' },
];

let insertados = 0;
let omitidos = 0;

for (const u of usuarios) {
  const hash = await bcrypt.hash(u.ci, 10);
  try {
    await pool.query(
      'INSERT INTO users (nombre, usuario, password, role) VALUES (?, ?, ?, ?)',
      [u.nombre, u.ci, hash, u.role]
    );
    console.log(`✓ ${u.ci} — ${u.nombre}`);
    insertados++;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.log(`  ya existe: ${u.ci} — ${u.nombre}`);
      omitidos++;
    } else {
      throw err;
    }
  }
}

console.log(`\nListo: ${insertados} insertados, ${omitidos} omitidos.`);
process.exit(0);
