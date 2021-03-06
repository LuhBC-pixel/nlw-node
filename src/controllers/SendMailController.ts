import { Request, Response } from "express";
import { resolve } from "path";
import { getCustomRepository } from "typeorm";
import { AppError } from "../errors/AppError";
import { SurveysRespository } from "../repositories/SurveysRepository";
import { SurveysUsersRepository } from "../repositories/SurveysUsersRepository";
import { UsersRespository } from "../repositories/UsersRespository";
import SendMailService from "../services/SendMailService";

class SendMailController {

    async execute(request: Request, response: Response) {
        const { email, survey_id } = request.body;

        const usersRepository = getCustomRepository(UsersRespository);
        const surveysRepository = getCustomRepository(SurveysRespository);
        const surveysUsersRepository = getCustomRepository(SurveysUsersRepository);

        const userAlreadyExist = await usersRepository.findOne({email});

        if (!userAlreadyExist) {
            throw new AppError('User does not exists');
        }

        const surveyAlreadyExist = await surveysRepository.findOne({id: survey_id});

        if (!surveyAlreadyExist) {
            throw new AppError('Survey does not exists!');
        }       

        const npsPath = resolve(__dirname, '..', 'views', 'emails', 'npsMail.hbs');

        const surveyUserAlreadyExist = await surveysUsersRepository.findOne({
            where: { user_id: userAlreadyExist.id , value: null },
            relations: ["user", "survey"],
        });

        const variables = {
            name: userAlreadyExist.name,
            title: surveyAlreadyExist.title,
            description: surveyAlreadyExist.description,
            id: '',
            link: process.env.URL_MAIL
        }

        if (surveyUserAlreadyExist) {
            variables.id = surveyUserAlreadyExist.id;
            await SendMailService.execute(email, surveyAlreadyExist.title, variables, npsPath);
            return response.json(surveyUserAlreadyExist);
        }

        // Salvar as informações na tabela surveyUser
        const surveyUser = surveysUsersRepository.create({
            user_id: userAlreadyExist.id,
            survey_id
        });

        await surveysUsersRepository.save(surveyUser);
        // Enviar e-mail para o usuário
        variables.id = surveyUser.id;

        await SendMailService.execute(email, surveyAlreadyExist.title, variables, npsPath);

        return response.json(surveyUser);
    }
}

export { SendMailController };