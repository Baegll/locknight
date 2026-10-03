import {writeFile,mkdir} from 'node:fs/promises';
import {allHeroes as heroes} from '../src/lib/catalog.mjs';
const ref=name=>({$ref:`#/$defs/${name}`}),id={type:'string',pattern:'^[a-zA-Z0-9_-]{1,100}$'},date={type:'string',format:'date-time'},text={type:'string',minLength:1,maxLength:500};
const object=(properties,required=Object.keys(properties))=>({type:'object',properties,required});
const team={type:'array',items:id,minItems:6,maxItems:6,uniqueItems:true},hero={enum:heroes.map(h=>h.id)},winner={enum:['amber','sapphire']};
const schema={
 $schema:'https://json-schema.org/draft/2020-12/schema',$id:'https://baegll.github.io/projects/locknight/schema-v1.json',title:'Locknight records v1',
 ...object({schemaVersion:{const:1},calculationVersion:{const:1},players:{type:'array',items:ref('player')},patches:{type:'array',items:ref('patch')},matches:{type:'array',items:ref('match')},ratingMetadata:ref('metadata'),ratingHistory:{type:'array',items:ref('history')}},['schemaVersion','calculationVersion','players','patches','matches','ratingMetadata']),
 $defs:{
  rating:object({mu:{type:'number'},sigma:{type:'number',exclusiveMinimum:0}}),
  player:object({id,name:text,enabled:{type:'boolean'},notes:{type:'string'},preferences:{type:'object',propertyNames:hero,additionalProperties:{type:'integer',minimum:-1,maximum:3}}},['id','name','enabled','preferences']),
  patch:object({id,label:text,effectiveAt:date,refreshedAt:date,sourceUrl:{type:'string',pattern:'^https://steamdb\\.info/(app/1422450/patchnotes/|patchnotes/[0-9]+/?)$'}}),
  edit:object({at:date,previousWinner:winner,winner}),
  metadata:object({model:{const:'PlackettLuce'},calculationVersion:{const:1},parameters:object({mu:{type:'number',exclusiveMinimum:0,maximum:1000},sigma:{type:'number',exclusiveMinimum:0,maximum:1000},beta:{type:'number',exclusiveMinimum:0,maximum:1000},tau:{type:'number',minimum:0,maximum:1000}})}),
  match:object({id,timestamp:date,patchId:id,teams:object({amber:team,sapphire:team}),heroes:{type:'object',minProperties:12,maxProperties:12,additionalProperties:hero},winner,draft:object({mode:{enum:['random','manual','captains']},settings:{type:'object',properties:{allowDuplicateHeroes:{type:'boolean'},excludedHeroes:{type:'array',items:hero,uniqueItems:true}}},snapshot:object({amberProbability:{type:'number',minimum:0,maximum:1},ratings:{type:'object',minProperties:12,maxProperties:12,additionalProperties:ref('rating')}})}),edits:{type:'array',items:ref('edit')}}),
  history:object({playerId:id,heroId:{anyOf:[hero,{type:'null'}]},matchId:id,timestamp:date,patchId:id,mu:{type:'number'},sigma:{type:'number',exclusiveMinimum:0}})
 }
};
await mkdir('public/projects/locknight',{recursive:true});await writeFile('public/projects/locknight/schema-v1.json',JSON.stringify(schema,null,2));
console.log('Wrote schema v1. Referential integrity, unique IDs and banned hero checks are enforced by validateData.');
const profileSchema={
 $schema:schema.$schema,$id:'https://baegll.github.io/projects/locknight/player-schema-v1.json',title:'Locknight player preferences v1',
 ...object({type:{const:'locknight-player'},schemaVersion:{const:1},player:object({id,name:{type:'string',minLength:1,maxLength:80},preferences:{type:'object',propertyNames:hero,additionalProperties:{type:'integer',minimum:-1,maximum:3}},notes:{type:'string',maxLength:2000}},['id','name','preferences'])})
};
await writeFile('public/projects/locknight/player-schema-v1.json',JSON.stringify(profileSchema,null,2));
