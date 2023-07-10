import { randomUUID } from 'node:crypto'
import { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { knex } from '../database'
import { checkUserExists } from '../middlewares/check-user-exists'

export async function mealsRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/',
    {
      preHandler: [checkUserExists],
    },
    async (request, reply) => {
      const bodySchema = z.object({
        name: z.string(),
        description: z.string().optional(),
        datetime: z.string().datetime(),
        onDiet: z.boolean(),
      })

      const { userId } = request.cookies

      const { name, description, datetime, onDiet } = bodySchema.parse(
        request.body,
      )

      await knex('meals').insert({
        id: randomUUID(),
        name,
        description,
        datetime,
        on_diet: onDiet,
        user_id: userId,
      })

      return reply.status(201).send()
    },
  )

  app.put(
    '/:id',
    {
      preHandler: [checkUserExists],
    },
    async (request, reply) => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = paramsSchema.parse(request.params)

      const { userId } = request.cookies

      const meal = await knex('meals')
        .where({
          id,
          user_id: userId,
        })
        .first()

      if (!meal) {
        return reply.status(404).send({
          message: 'Meal not found.',
        })
      }

      const bodySchema = z.object({
        name: z.string(),
        description: z.string().optional(),
        datetime: z.string().datetime(),
        onDiet: z.boolean(),
      })

      const { name, description, datetime, onDiet } = bodySchema.parse(
        request.body,
      )

      await knex('meals').where({ id }).update({
        name,
        description,
        datetime,
        on_diet: onDiet,
        updated_at: new Date().toISOString(),
      })

      return reply.status(204).send()
    },
  )

  app.delete(
    '/:id',
    {
      preHandler: [checkUserExists],
    },
    async (request, reply) => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = paramsSchema.parse(request.params)

      const { userId } = request.cookies

      const meal = await knex('meals')
        .where({
          id,
          user_id: userId,
        })
        .first()

      if (!meal) {
        return reply.status(404).send({
          message: 'Meal not found.',
        })
      }

      await knex('meals').where({ id }).del()

      return reply.status(204).send()
    },
  )

  app.get(
    '/',
    {
      preHandler: [checkUserExists],
    },
    async (request) => {
      const { userId } = request.cookies

      const meals = await knex('meals').where('user_id', userId).select()

      return { meals }
    },
  )

  app.get(
    '/:id',
    {
      preHandler: [checkUserExists],
    },
    async (request, reply) => {
      const paramsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = paramsSchema.parse(request.params)

      const { userId } = request.cookies

      const meal = await knex('meals')
        .where({
          id,
          user_id: userId,
        })
        .first()

      if (!meal) {
        return reply.status(404).send({
          message: 'Meal not found.',
        })
      }

      return meal
    },
  )

  app.get(
    '/summary',
    {
      preHandler: [checkUserExists],
    },
    async (request) => {
      const { userId } = request.cookies

      const meals = await knex('meals')
        .where('user_id', userId)
        .orderBy('created_at', 'asc')
        .select()

      const sequencesOfOnDietMeals = [0]
      let count = 0
      meals.forEach((meal, index) => {
        if (meal.on_diet) {
          count += 1

          if (index === meals.length - 1) {
            sequencesOfOnDietMeals.push(count)
          }
        }

        if (!meal.on_diet && count > 0) {
          sequencesOfOnDietMeals.push(count)
          count = 0
        }
      })

      const total = meals.length
      const onDietMeals = meals.filter((meal) => meal.on_diet).length
      const offDietMeals = meals.filter((meal) => !meal.on_diet).length
      const bestSequenceOfOnDietMeals = Math.max(...sequencesOfOnDietMeals)

      return {
        total,
        onDietMeals,
        offDietMeals,
        bestSequenceOfOnDietMeals,
      }
    },
  )
}
