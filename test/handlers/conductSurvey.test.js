import test from 'ava'
import sinon from 'sinon'
import setupBot from '../helpers/setupBot'

test.beforeEach(setupBot)
test.beforeEach(({ context }) => { context.user = context.bot.createUser() })

test('bot gives a survey', async t => {
  const { bot, controller, user } = t.context

  const surveyorName = 'Bob'

  const survey = {
    data: {
      questions: [
        { text: 'What is your favorite color?', type: 'text', id: 1 },
        { text: 'What is your favorite sport?', type: 'text', id: 2 }
      ]
    }
  }
  const recordAnswer = sinon.stub()
  const recordCompletion = sinon.stub()

  controller.trigger(
    'conduct_survey',
    [bot, { survey, roomForSurvey: { id: user.channel }, personEmail: user.id, recordAnswer, recordCompletion, surveyorName }]
  )

  const introAndFirstQuestion = await bot.nextResponse()
  t.is(introAndFirstQuestion.channel, user.channel)
  t.regex(introAndFirstQuestion.text, /Hi!/)
  t.regex(introAndFirstQuestion.text, /Bob/)
  t.regex(introAndFirstQuestion.text, /Question 1 of 2/)
  t.regex(introAndFirstQuestion.text, /What is your favorite color\?/)

  const favoriteColor = 'blue'
  user.says(favoriteColor)

  const secondQuestion = await bot.nextResponse()
  t.regex(secondQuestion.text, /Question 2 of 2/)
  t.regex(secondQuestion.text, /What is your favorite sport\?/)

  const favoriteSport = 'fuß'
  user.says(favoriteSport)

  const next = await bot.nextResponse()
  t.regex(next.text, /Thanks/)

  t.true(recordAnswer.calledWith(survey.data.questions[0].id, favoriteColor))
  t.true(recordAnswer.calledWith(survey.data.questions[1].id, favoriteSport))
  t.true(recordCompletion.calledOnce)
})

test('bot gives a survey with multiple choice question', async t => {
  const { bot, controller, user } = t.context

  const survey = {
    data: {
      questions: [
        { text: 'What is your favorite color?', type: 'text', id: 1 },
        { text: 'Mac or PC?', type: 'multi', choices: [{ text: 'Mac' }, { text: 'PC' }], id: 2 }
      ]
    }
  }
  const recordAnswer = sinon.stub()
  const recordCompletion = sinon.stub()

  controller.trigger(
    'conduct_survey',
    [bot, { survey, roomForSurvey: { id: user.channel }, personEmail: user.id, recordAnswer, recordCompletion }]
  )

  const introAndFirstQuestion = await bot.nextResponse()
  t.is(introAndFirstQuestion.channel, user.channel)
  t.regex(introAndFirstQuestion.text, /What is your favorite color?/)

  const favoriteColor = 'blue'
  user.says(favoriteColor)

  const secondQuestion = await bot.nextResponse()
  t.regex(secondQuestion.text, /Mac or PC\?/)

  const secondQuestionOptions = await bot.nextResponse()
  t.regex(secondQuestionOptions.text, /1. Mac/)
  t.regex(secondQuestionOptions.text, /2. PC/)

  const mac = '1'
  user.says(mac)

  const next = await bot.nextResponse()
  t.regex(next.text, /Thanks/)

  t.true(recordAnswer.calledWith(survey.data.questions[0].id, favoriteColor))
  t.true(recordAnswer.calledWith(survey.data.questions[1].id, mac))
  t.true(recordCompletion.calledOnce)
})

test('bot requires number of mutiple choice answer', async t => {
  const { bot, controller, user } = t.context

  const survey = {
    data: {
      questions: [
        { text: 'Mac or PC?', type: 'multi', choices: [{ text: 'Mac' }, { text: 'PC' }], id: 1 }
      ]
    }
  }
  const recordAnswer = sinon.stub()
  const recordCompletion = sinon.stub()

  controller.trigger(
    'conduct_survey',
    [bot, { survey, roomForSurvey: { id: user.channel }, personEmail: user.id, recordAnswer, recordCompletion }]
  )

  const question = await bot.nextResponse()
  t.regex(question.text, /Mac or PC\?/)

  const questionOptions = await bot.nextResponse()
  t.regex(questionOptions.text, /1. Mac/)
  t.regex(questionOptions.text, /2. PC/)

  user.says('Dell')

  let next = await bot.nextResponse()
  t.regex(next.text, /Sorry/)
  next = await bot.nextResponse()
  t.regex(next.text, /1. Mac/)
  t.regex(next.text, /2. PC/)

  user.says('3')

  next = await bot.nextResponse()
  t.regex(next.text, /Sorry/)
  next = await bot.nextResponse()
  t.regex(next.text, /1. Mac/)
  t.regex(next.text, /2. PC/)

  const mac = '1'
  user.says(mac)

  next = await bot.nextResponse()
  t.regex(next.text, /Thanks/)

  t.true(recordAnswer.calledWith(survey.data.questions[0].id, mac))
  t.true(recordCompletion.calledOnce)
})

test('descriptions', async t => {
  const { bot, controller, user } = t.context

  const trigger = survey => {
    const recordAnswer = sinon.stub()
    const recordCompletion = sinon.stub()

    controller.trigger(
      'conduct_survey',
      [bot, { survey, roomForSurvey: { id: user.channel }, personEmail: user.id, recordAnswer, recordCompletion }]
    )
  }

  trigger({
    data: {
      description: 'The Description',
      questions: [{ text: 'eh?', type: 'text', id: 1 }]
    }
  })

  const titleWithDescription = await bot.nextResponse()
  t.regex(titleWithDescription.text, /About/)
  t.regex(titleWithDescription.text, /The Description/)

  trigger({
    data: {
      questions: [{ text: 'eh?', type: 'text', id: 1 }]
    }
  })

  const titleWithoutDescription = await bot.nextResponse()
  t.falsy(titleWithoutDescription.text.match(/About/))
})
